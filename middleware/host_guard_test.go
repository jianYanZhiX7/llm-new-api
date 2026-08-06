package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func performHostGuardRequest(t *testing.T, host string) *httptest.ResponseRecorder {
	t.Helper()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(HostGuard())
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	if host != "" {
		request.Host = host
	}
	router.ServeHTTP(recorder, request)
	return recorder
}

func TestHostGuardAllowsAllWhenKeywordUnset(t *testing.T) {
	t.Setenv("ALLOWED_HOST_KEYWORD", "")

	recorder := performHostGuardRequest(t, "14.103.61.25")

	require.Equal(t, http.StatusOK, recorder.Code)
}

func TestHostGuardAllowsMatchingHost(t *testing.T) {
	t.Setenv("ALLOWED_HOST_KEYWORD", "aigotoken")

	recorder := performHostGuardRequest(t, "www.aigotoken.com")

	require.Equal(t, http.StatusOK, recorder.Code)
}

func TestHostGuardBlocksNonMatchingHost(t *testing.T) {
	t.Setenv("ALLOWED_HOST_KEYWORD", "aigotoken")

	recorder := performHostGuardRequest(t, "14.103.61.25")

	require.Equal(t, http.StatusForbidden, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "host_guard_blocked")
}

func TestHostGuardMatchesCaseInsensitive(t *testing.T) {
	t.Setenv("ALLOWED_HOST_KEYWORD", "aigotoken")

	recorder := performHostGuardRequest(t, "WWW.AIGOTOKEN.COM")

	require.Equal(t, http.StatusOK, recorder.Code)
}

func TestHostGuardAllowsMatchingHostWithPort(t *testing.T) {
	t.Setenv("ALLOWED_HOST_KEYWORD", "aigotoken")

	recorder := performHostGuardRequest(t, "aigotoken.com:8080")

	require.Equal(t, http.StatusOK, recorder.Code)
}

func TestHostGuardBlocksEmptyHostWhenKeywordSet(t *testing.T) {
	t.Setenv("ALLOWED_HOST_KEYWORD", "aigotoken")

	recorder := performHostGuardRequest(t, "")

	require.Equal(t, http.StatusForbidden, recorder.Code)
}
