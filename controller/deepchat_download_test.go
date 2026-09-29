package controller

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupDeepChatDownload(t *testing.T) (http.Handler, string) {
	t.Helper()
	_, pat := setupAccessTokenAudit(t)
	path := filepath.Join(t.TempDir(), "package.json")
	require.NoError(t, os.WriteFile(path, []byte(`{"version":"1.1.0-beta.11"}`), 0o644))
	previousPath := common.DeepChatPackageJSONPath
	common.DeepChatPackageJSONPath = path
	t.Cleanup(func() { common.DeepChatPackageJSONPath = previousPath })

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/api/deepchat/download/status", middleware.DisableCache(), DeepChatDownloadStatus)
	router.GET("/api/deepchat/download", middleware.UserAuth(), middleware.DisableCache(), DeepChatDownload)
	return router, pat
}

func deepChatGet(t *testing.T, router http.Handler, target, credential string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(http.MethodGet, target, nil)
	if credential != "" {
		request.Header.Set("Authorization", "Bearer "+credential)
	}
	request.Header.Set("User-Agent", "deepchat-download-test")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestDeepChatDownloadStatusIsPublic(t *testing.T) {
	router, _ := setupDeepChatDownload(t)
	response := deepChatGet(t, router, "/api/deepchat/download/status", "")
	require.Equal(t, http.StatusOK, response.Code)
	var result struct {
		Success   bool   `json:"success"`
		Available bool   `json:"available"`
		Version   string `json:"version"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &result))
	assert.True(t, result.Success)
	assert.Equal(t, "1.1.0-beta.11", result.Version)
	assert.False(t, result.Available, "no TOS credentials are configured in tests, so the download client is unavailable")
}

func TestDeepChatDownloadRequiresAuthentication(t *testing.T) {
	router, _ := setupDeepChatDownload(t)
	response := deepChatGet(t, router, "/api/deepchat/download?platform=windows-x64", "")
	assert.Equal(t, http.StatusUnauthorized, response.Code)
}

func TestDeepChatDownloadRejectsUnknownPlatform(t *testing.T) {
	router, pat := setupDeepChatDownload(t)
	for _, target := range []string{
		"/api/deepchat/download",
		"/api/deepchat/download?platform=",
		"/api/deepchat/download?platform=windows",
		"/api/deepchat/download?platform=DeepChat-1.1.0-beta.11-windows-x64.exe",
	} {
		response := deepChatGet(t, router, target, pat)
		assert.Equal(t, http.StatusBadRequest, response.Code, "target=%s", target)
		assert.Contains(t, response.Body.String(), `"success":false`)
	}
}
