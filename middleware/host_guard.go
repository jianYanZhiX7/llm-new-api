package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

// HostGuard blocks requests whose Host header does not contain the
// ALLOWED_HOST_KEYWORD keyword. When the env var is unset, all hosts pass.
func HostGuard() gin.HandlerFunc {
	keyword := strings.ToLower(strings.TrimSpace(os.Getenv("ALLOWED_HOST_KEYWORD")))
	if keyword == "" {
		return func(c *gin.Context) { c.Next() }
	}
	return func(c *gin.Context) {
		host := strings.ToLower(c.Request.Host)
		if strings.Contains(host, keyword) {
			c.Next()
			return
		}
		common.SysLog(fmt.Sprintf("host guard blocked: host=%q keyword=%q path=%s", c.Request.Host, keyword, c.Request.URL.Path))
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": gin.H{
			},
		})
	}
}
