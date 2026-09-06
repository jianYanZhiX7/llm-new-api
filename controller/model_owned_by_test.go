package controller

import (
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestChannelOwnerNameUsesAdaptorChannelName(t *testing.T) {
	tests := []struct {
		name        string
		channelType int
		expected    string
	}{
		{
			name:        "openai",
			channelType: constant.ChannelTypeOpenAI,
			expected:    "openai",
		},
		{
			name:        "codex",
			channelType: constant.ChannelTypeCodex,
			expected:    "codex",
		},
		{
			name:        "openrouter",
			channelType: constant.ChannelTypeOpenRouter,
			expected:    "openrouter",
		},
		{
			name:        "azure fallback",
			channelType: constant.ChannelTypeAzure,
			expected:    "azure",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.expected, channelOwnerName(tt.channelType))
		})
	}
}

func TestBuildOpenAIModelDerivesOwnedByFromModelName(t *testing.T) {
	modelItem := buildOpenAIModel("gpt-5.4", map[string]string{"gpt-5.4": "openai"})
	require.Equal(t, "gpt-5.4", modelItem.Id)
	require.Equal(t, "gpt", modelItem.OwnedBy)
}

func TestOwnedByFromModelName(t *testing.T) {
	tests := []struct {
		name      string
		modelName string
		expected  string
	}{
		{"deepseek hyphen", "deepseek-v4-pro", "deepseek"},
		{"gpt dot", "gpt-5.4", "gpt"},
		{"digits stripped", "qwen2.5-max", "qwen"},
		{"claude multi hyphen", "claude-3-5-sonnet", "claude"},
		{"gemini slash", "gemini/2.0-flash", "gemini"},
		{"underscore separator", "my_model_v2", "my"},
		{"custom fallback name", "custom-test-model", "custom"},
		{"no letters falls back", "360-v1", "custom"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.expected, ownedByFromModelName(tt.modelName))
		})
	}
}

func TestBuildOpenAIModelFallsBackToCustomForUnknownModels(t *testing.T) {
	modelItem := buildOpenAIModel("custom-test-model", nil)
	require.Equal(t, "custom-test-model", modelItem.Id)
	require.Equal(t, "custom", modelItem.OwnedBy)
}

func TestGetModelListGroupsUsesUserGroupWhenTokenGroupIsEmpty(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	common.SetContextKey(ctx, constant.ContextKeyUserGroup, "default")

	groups, err := getModelListGroups(ctx)
	require.NoError(t, err)

	require.Equal(t, "default", groups.userGroup)
	require.Empty(t, groups.tokenGroup)
	require.Equal(t, []string{"default"}, groups.ownerGroups)
}

func TestGetModelListGroupsUsesExplicitTokenGroup(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	common.SetContextKey(ctx, constant.ContextKeyUserGroup, "default")
	common.SetContextKey(ctx, constant.ContextKeyTokenGroup, "vip")

	groups, err := getModelListGroups(ctx)
	require.NoError(t, err)

	require.Equal(t, "default", groups.userGroup)
	require.Equal(t, "vip", groups.tokenGroup)
	require.Equal(t, []string{"vip"}, groups.ownerGroups)
}
