package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"

	"github.com/gin-gonic/gin"
)

func SetOAuthProviderRoutes(apiRouter gin.IRouter) {
	apiRouter.POST("/oauth/authorize", middleware.UserAuth(), middleware.CriticalRateLimit(), controller.OAuthProviderAuthorize)
	apiRouter.POST("/oauth/token", middleware.CriticalRateLimit(), controller.OAuthProviderToken)
}
