package channel

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	common2 "github.com/QuantumNous/new-api/common"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDoRequestAppendsUpstreamMeta(t *testing.T) {
	service.InitHttpClient()
	gin.SetMode(gin.TestMode)

	authHeaderCh := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeaderCh <- r.Header.Get("Authorization")
		w.Header().Set("X-Upstream-Header", "up-value")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, `{"ok":true}`)
	}))
	defer upstream.Close()

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, upstream.URL, strings.NewReader(`{}`))
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer sk-upstream-secret")

	info := &relaycommon.RelayInfo{
		RetryIndex: 2,
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: "gpt-4o",
		},
	}

	resp, err := DoRequest(c, req, info)
	require.NoError(t, err)
	require.NotNil(t, resp)
	_ = resp.Body.Close()

	assert.Equal(t, "Bearer sk-upstream-secret", <-authHeaderCh)

	metas := common2.GetUpstreamMeta(c)
	require.Len(t, metas, 1)
	assert.Equal(t, 2, metas[0].Attempt)
	assert.Equal(t, http.MethodPost, metas[0].Method)
	assert.Equal(t, upstream.URL, metas[0].URL)
	assert.Equal(t, "gpt-4o", metas[0].Model)
	assert.Equal(t, http.StatusOK, metas[0].StatusCode)
	assert.Equal(t, "Bearer sk-upstream-secret", metas[0].RequestHeaders.Get("Authorization"))
	assert.Equal(t, "up-value", metas[0].ResponseHeaders.Get("X-Upstream-Header"))
}

func TestDoRequestAppendsUpstreamMetaOnError(t *testing.T) {
	service.InitHttpClient()
	gin.SetMode(gin.TestMode)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	serverURL := server.URL
	server.Close()

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, serverURL, strings.NewReader(`{}`))
	require.NoError(t, err)

	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: "gpt-4o-mini",
		},
	}

	resp, err := DoRequest(c, req, info)
	require.Error(t, err)
	require.Nil(t, resp)

	metas := common2.GetUpstreamMeta(c)
	require.Len(t, metas, 1)
	assert.Equal(t, "gpt-4o-mini", metas[0].Model)
	assert.NotEmpty(t, metas[0].Error)
	assert.Zero(t, metas[0].StatusCode)
	assert.NotNil(t, metas[0].RequestHeaders)
}
