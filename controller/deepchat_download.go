package controller

import (
	"fmt"
	"net/http"

	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

const maxLoggedPlatformLength = 64

func truncatePlatformForLog(platform string) string {
	if len(platform) <= maxLoggedPlatformLength {
		return platform
	}
	return platform[:maxLoggedPlatformLength] + "..."
}

func DeepChatDownloadStatus(c *gin.Context) {
	available, version := service.DeepChatAvailability()
	logger.LogDebug(c.Request.Context(), "DeepChat download status queried: available=%v, version=%q", available, version)
	c.JSON(http.StatusOK, gin.H{"success": true, "available": available, "version": version})
}

func DeepChatDownload(c *gin.Context) {
	userId := c.GetInt("id")
	platform := c.Query("platform")
	if platform == "" {
		logger.LogWarn(c.Request.Context(), "DeepChat download rejected: platform query parameter is required (user_id=%d)", userId)
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "platform query parameter is required"})
		return
	}
	objectKey, ok := service.DeepChatObjectKey(platform)
	if !ok {
		logger.LogWarn(c.Request.Context(), "DeepChat download rejected: unsupported or unresolved platform (user_id=%d, platform=%q)", userId, truncatePlatformForLog(platform))
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "unsupported platform: " + platform})
		return
	}
	tosSvc := service.GetTOSService()
	if !tosSvc.IsAvailable() {
		logger.LogError(c.Request.Context(), fmt.Sprintf(
			"DeepChat download unavailable: TOS storage is not configured (user_id=%d, platform=%s)", userId, platform))
		c.JSON(http.StatusServiceUnavailable, gin.H{"success": false, "message": "download service is currently unavailable"})
		return
	}
	url, err := tosSvc.GenerateSignedURL(objectKey, service.TOSSignedURLExpires)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf(
			"DeepChat signed URL generation failed (user_id=%d, platform=%s, object_key=%s): %s",
			userId, platform, objectKey, err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to generate download URL"})
		return
	}
	logger.LogInfo(c.Request.Context(), fmt.Sprintf(
		"DeepChat download link issued (user_id=%d, platform=%s, object_key=%s, expires_in=%ds)",
		userId, platform, objectKey, service.TOSSignedURLExpires))
	c.JSON(http.StatusOK, gin.H{"success": true, "url": url})
}
