package controller

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	oauthProviderCodeTTL = 5 * time.Minute
)

type oauthProviderClient struct {
	RedirectURI string
	TokenName   string
	DisplayName string
}

var oauthProviderClients = map[string]oauthProviderClient{
	"claude-desktop-app": {
		RedirectURI: "http://127.0.0.1:30080/api/aigotoken/callback",
		TokenName:   "Claude-Code",
		DisplayName: "Claude Desktop App",
	},
	"deepchat": {
		RedirectURI: "http://localhost:1456/oauth/aigotoken/callback",
		TokenName:   "DeepChat",
		DisplayName: "DeepChat",
	},
}

type oauthProviderAuthorizeRequest struct {
	ClientID            string `json:"client_id"`
	RedirectURI        string `json:"redirect_uri"`
	ResponseType       string `json:"response_type"`
	CodeChallenge      string `json:"code_challenge"`
	CodeChallengeMethod string `json:"code_challenge_method"`
	State              string `json:"state"`
}

type oauthProviderCodePayload struct {
	CodeChallenge       string `json:"code_challenge"`
	CodeChallengeMethod string `json:"code_challenge_method"`
	RedirectURI         string `json:"redirect_uri"`
	ClientID            string `json:"client_id"`
	TokenID             int    `json:"token_id"`
}

func OAuthProviderAuthorize(c *gin.Context) {
	var req oauthProviderAuthorizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request body"})
		return
	}
	client, exists := oauthProviderClients[req.ClientID]
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid client_id"})
		return
	}
	if req.RedirectURI != client.RedirectURI {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid redirect_uri"})
		return
	}
	if req.CodeChallengeMethod != "S256" || req.CodeChallenge == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "pkce code_challenge (S256) required"})
		return
	}
	if req.ResponseType != "code" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "unsupported response_type"})
		return
	}
	if req.State == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "state required"})
		return
	}

	userId := c.GetInt("id")
	if userId == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "login required"})
		return
	}

	token, err := findOrCreateOAuthProviderToken(userId, client.TokenName)
	if err != nil {
		common.SysLog("oauth_provider: find-or-create token failed: " + err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "token creation failed"})
		return
	}

	payload, err := json.Marshal(oauthProviderCodePayload{
		CodeChallenge:       req.CodeChallenge,
		CodeChallengeMethod: req.CodeChallengeMethod,
		RedirectURI:         req.RedirectURI,
		ClientID:            req.ClientID,
		TokenID:             token.Id,
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}

	expiresAt := time.Now().Add(oauthProviderCodeTTL)
	code, _, err := model.CreateAuthFlow(model.AuthFlowCreate{
		Purpose:   model.AuthFlowPurposeOAuthProvider,
		Provider:  req.ClientID,
		UserId:    userId,
		Payload:   string(payload),
		ExpiresAt: expiresAt,
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"code":         code,
			"state":        req.State,
			"redirect_uri": req.RedirectURI,
		},
	})
}

var oauthProviderTokenMu sync.Mutex

func findOrCreateOAuthProviderToken(userId int, tokenName string) (*model.Token, error) {
	oauthProviderTokenMu.Lock()
	defer oauthProviderTokenMu.Unlock()
	existing, err := model.FindUserTokenByName(userId, tokenName)
	if err == nil && existing != nil {
		if existing.Status != 1 {
			existing.Status = 1
			if updateErr := existing.Update(); updateErr != nil {
				common.SysLog("oauth_provider: failed to re-enable token: " + updateErr.Error())
			}
		}
		return existing, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	key, err := common.GenerateKey()
	if err != nil {
		return nil, err
	}
	now := common.GetTimestamp()
	token := &model.Token{
		UserId:         userId,
		Name:           tokenName,
		Key:            key,
		Status:         1,
		CreatedTime:    now,
		AccessedTime:   now,
		ExpiredTime:    -1,
		UnlimitedQuota: true,
		Group:          "",
	}
	if err := token.Insert(); err != nil {
		return nil, err
	}
	return token, nil
}

type oauthProviderTokenRequest struct {
	GrantType    string `json:"grant_type"`
	Code         string `json:"code"`
	CodeVerifier string `json:"code_verifier"`
	ClientID     string `json:"client_id"`
	RedirectURI  string `json:"redirect_uri"`
}

func OAuthProviderToken(c *gin.Context) {
	var req oauthProviderTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request body"})
		return
	}
	if req.GrantType != "authorization_code" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "unsupported grant_type"})
		return
	}
	client, exists := oauthProviderClients[req.ClientID]
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid client_id"})
		return
	}
	if req.RedirectURI != client.RedirectURI {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid redirect_uri"})
		return
	}
	if req.Code == "" || req.CodeVerifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "code and code_verifier required"})
		return
	}

	flow, err := model.ConsumeAuthFlow(req.Code, model.AuthFlowMatch{
		Purpose:  model.AuthFlowPurposeOAuthProvider,
		Provider: req.ClientID,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid or expired code"})
		return
	}

	var payload oauthProviderCodePayload
	if err := json.Unmarshal([]byte(flow.Payload), &payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "payload decode failed"})
		return
	}
	if payload.ClientID != req.ClientID || payload.RedirectURI != req.RedirectURI {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "client/redirect mismatch"})
		return
	}
	if !verifyPKCE(req.CodeVerifier, payload.CodeChallenge) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "pkce verification failed"})
		return
	}

	token, err := model.GetTokenById(payload.TokenID)
	if err != nil || token == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "token lookup failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": "sk-" + token.Key,
		"token_type":   "bearer",
	})
}

func verifyPKCE(verifier, challenge string) bool {
	if verifier == "" || challenge == "" {
		return false
	}
	if len(verifier) < 43 || len(verifier) > 128 {
		return false
	}
	sum := sha256.Sum256([]byte(verifier))
	computed := base64.RawURLEncoding.EncodeToString(sum[:])
	return computed == challenge
}
