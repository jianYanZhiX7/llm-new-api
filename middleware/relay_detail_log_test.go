package middleware

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newRelayDetailLogRouter(t *testing.T, handler gin.HandlerFunc) (*gin.Engine, string) {
	t.Helper()
	dir := t.TempDir()
	t.Setenv(relayDetailLogEnvEnabled, "true")
	t.Setenv(relayDetailLogEnvDir, dir)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RelayDetailLog())
	router.POST("/v1/chat/completions", handler)
	return router, dir
}

func findRelayDetailLogFiles(t *testing.T, dir string) []string {
	t.Helper()
	matches, err := filepath.Glob(filepath.Join(dir, "*", "*.json"))
	require.NoError(t, err)
	return matches
}

func readRelayDetailRecord(t *testing.T, filename string) *relayDetailRecord {
	t.Helper()
	data, err := os.ReadFile(filename)
	require.NoError(t, err)
	var record relayDetailRecord
	require.NoError(t, common.Unmarshal(data, &record))
	return &record
}

func performRelayDetailRequest(t *testing.T, router *gin.Engine, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer sk-test-user-key")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func TestRelayDetailLogDisabledWritesNothing(t *testing.T) {
	dir := t.TempDir()
	t.Setenv(relayDetailLogEnvEnabled, "false")
	t.Setenv(relayDetailLogEnvDir, dir)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RelayDetailLog())
	router.POST("/v1/chat/completions", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := performRelayDetailRequest(t, router, `{"messages":[{"role":"user","content":"hi"}]}`)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Empty(t, findRelayDetailLogFiles(t, dir), "disabled flag must not write any file")
}

func TestRelayDetailLogNonStreamRecordsFields(t *testing.T) {
	router, dir := newRelayDetailLogRouter(t, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"choices": []gin.H{{"message": gin.H{"role": "assistant", "content": "hello user"}}}})
	})

	w := performRelayDetailRequest(t, router, `{"messages":[{"role":"user","content":"hi"}]}`)
	assert.Equal(t, http.StatusOK, w.Code)

	files := findRelayDetailLogFiles(t, dir)
	require.Len(t, files, 1)
	record := readRelayDetailRecord(t, files[0])

	assert.Equal(t, http.MethodPost, record.Method)
	assert.Equal(t, "/v1/chat/completions", record.Path)
	assert.Equal(t, http.StatusOK, record.Status)
	assert.False(t, record.IsStream)
	assert.Equal(t, "Bearer sk-test-user-key", record.RequestHeaders.Get("Authorization"))
	assert.JSONEq(t, `{"messages":[{"role":"user","content":"hi"}]}`, record.RequestBody)
	assert.False(t, record.RequestTruncated)
	assert.Contains(t, record.ResponseBody, "hello user")
	assert.False(t, record.ResponseTruncated)

	info, err := os.Stat(files[0])
	require.NoError(t, err)
	assert.Equal(t, os.FileMode(0o600), info.Mode().Perm())
	dayDirInfo, err := os.Stat(filepath.Dir(files[0]))
	require.NoError(t, err)
	assert.Equal(t, os.FileMode(0o700), dayDirInfo.Mode().Perm())
}

func TestRelayDetailLogStreamCapturesChunksInOrder(t *testing.T) {
	router, dir := newRelayDetailLogRouter(t, func(c *gin.Context) {
		c.Writer.Header().Set("Content-Type", "text/event-stream")
		c.Status(http.StatusOK)
		for i := 1; i <= 3; i++ {
			_, _ = c.Writer.WriteString(fmt.Sprintf("data: chunk%d\n\n", i))
			c.Writer.Flush()
		}
	})

	w := performRelayDetailRequest(t, router, `{"stream":true}`)
	assert.Equal(t, http.StatusOK, w.Code)

	files := findRelayDetailLogFiles(t, dir)
	require.Len(t, files, 1)
	record := readRelayDetailRecord(t, files[0])

	assert.True(t, record.IsStream)
	assert.Equal(t, "data: chunk1\n\ndata: chunk2\n\ndata: chunk3\n\n", record.ResponseBody)
	assert.False(t, record.ResponseTruncated)
}

func TestRelayDetailLogTruncatesBodies(t *testing.T) {
	router, dir := newRelayDetailLogRouter(t, func(c *gin.Context) {
		c.String(http.StatusOK, strings.Repeat("x", 64))
	})
	t.Setenv(relayDetailLogEnvMaxBody, "16")

	const requestBody = `{"messages":[{"role":"user","content":"a very long message here"}]}`
	w := performRelayDetailRequest(t, router, requestBody)
	assert.Equal(t, http.StatusOK, w.Code)

	files := findRelayDetailLogFiles(t, dir)
	require.Len(t, files, 1)
	record := readRelayDetailRecord(t, files[0])

	assert.True(t, record.RequestTruncated)
	assert.Len(t, record.RequestBody, 16)
	assert.True(t, record.ResponseTruncated)
	assert.Len(t, record.ResponseBody, 16)
	assert.Equal(t, strings.Repeat("x", 16), record.ResponseBody)
}

func TestRelayDetailLogBinaryResponseBase64(t *testing.T) {
	router, dir := newRelayDetailLogRouter(t, func(c *gin.Context) {
		c.Data(http.StatusOK, "application/octet-stream", []byte{0x00, 0xff, 0x80})
	})

	w := performRelayDetailRequest(t, router, `{"binary":true}`)
	assert.Equal(t, http.StatusOK, w.Code)

	files := findRelayDetailLogFiles(t, dir)
	require.Len(t, files, 1)
	record := readRelayDetailRecord(t, files[0])

	assert.Equal(t, "base64", record.ResponseBodyEnc)
	data, err := os.ReadFile(files[0])
	require.NoError(t, err)
	assert.Contains(t, string(data), `"response_body_encoding":"base64"`)
	assert.Contains(t, string(data), `"response_body":"AP+A"`)
}

func TestRelayDetailLogChannelContextFields(t *testing.T) {
	router, dir := newRelayDetailLogRouter(t, func(c *gin.Context) {
		common.SetContextKey(c, constant.ContextKeyChannelId, 7)
		common.SetContextKey(c, constant.ContextKeyChannelName, "test-channel")
		common.SetContextKey(c, constant.ContextKeyChannelType, 1)
		common.SetContextKey(c, constant.ContextKeyChannelBaseUrl, "https://upstream.example.com")
		common.SetContextKey(c, constant.ContextKeyChannelKey, "sk-channel-secret")
		common.SetContextKey(c, constant.ContextKeyUserId, 42)
		common.SetContextKey(c, constant.ContextKeyUserName, "alice")
		common.SetContextKey(c, constant.ContextKeyTokenId, 5)
		common.SetContextKey(c, constant.ContextKeyUsingGroup, "vip")
		common.SetContextKey(c, constant.ContextKeyOriginalModel, "gpt-4o")
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := performRelayDetailRequest(t, router, `{}`)
	assert.Equal(t, http.StatusOK, w.Code)

	files := findRelayDetailLogFiles(t, dir)
	require.Len(t, files, 1)
	record := readRelayDetailRecord(t, files[0])

	require.NotNil(t, record.Channel)
	assert.Equal(t, 7, record.Channel.Id)
	assert.Equal(t, "test-channel", record.Channel.Name)
	assert.Equal(t, "https://upstream.example.com", record.Channel.BaseUrl)
	assert.Equal(t, "sk-channel-secret", record.Channel.ApiKey)
	require.NotNil(t, record.User)
	assert.Equal(t, 42, record.User.Id)
	assert.Equal(t, "alice", record.User.Username)
	assert.Equal(t, 5, record.User.TokenId)
	assert.Equal(t, "vip", record.User.Group)
	assert.Equal(t, "gpt-4o", record.RequestedModel)
}

func TestUpstreamMetaAppendAndGet(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	require.Nil(t, common.GetUpstreamMeta(c))

	common.AppendUpstreamMeta(c, common.UpstreamMeta{Attempt: 0, Model: "gpt-4o", StatusCode: 200})
	common.AppendUpstreamMeta(c, common.UpstreamMeta{Attempt: 1, Model: "gpt-4o", Error: "boom"})

	metas := common.GetUpstreamMeta(c)
	require.Len(t, metas, 2)
	assert.Equal(t, 0, metas[0].Attempt)
	assert.Equal(t, 200, metas[0].StatusCode)
	assert.Equal(t, 1, metas[1].Attempt)
	assert.Equal(t, "boom", metas[1].Error)

	metas[0].Model = "mutated"
	assert.Equal(t, "gpt-4o", common.GetUpstreamMeta(c)[0].Model, "returned slice must be a copy")
}

func TestRelayDetailSlug(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"", "request"},
		{"/v1/chat/completions", "v1_chat_completions"},
		{"a b:c", "a_b_c"},
		{"安全路径/测试", "request"},
	}
	for _, tc := range cases {
		assert.Equal(t, tc.want, relayDetailSlug(tc.in))
	}
}
