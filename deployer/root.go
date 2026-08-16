package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
)

var channelTypeMap = map[string]int{
	"openai":         1,
	"midjourney":     2,
	"azure":          3,
	"ollama":         4,
	"anthropic":      14,
	"baidu":          15,
	"zhipu":          16,
	"ali":            17,
	"xunfei":         18,
	"openrouter":     20,
	"tencent":        23,
	"gemini":         24,
	"moonshot":       25,
	"perplexity":     27,
	"aws":            33,
	"cohere":         34,
	"minimax":        35,
	"dify":           37,
	"jina":           38,
	"cloudflare":     39,
	"siliconflow":    40,
	"vertexai":       41,
	"mistral":        42,
	"deepseek":       43,
	"volcengine":     45,
	"baiduv2":        46,
	"xinference":     47,
	"xai":            48,
	"coze":           49,
	"kling":          50,
	"replicate":      56,
	"codex":          57,
	"advancedcustom": 58,
	"newapi":         60,
}

var globalFlags struct {
	Server    string
	Token     string
	UserToken string
}

func resolveChannelType(input string) (int, error) {
	if id, err := strconv.Atoi(input); err == nil {
		return id, nil
	}
	lower := strings.ToLower(input)
	if id, ok := channelTypeMap[lower]; ok {
		return id, nil
	}
	return 0, fmt.Errorf("unknown channel type %q, use a numeric ID or one of: %s", input, channelTypeNames())
}

func channelTypeNames() string {
	names := make([]string, 0, len(channelTypeMap))
	for name := range channelTypeMap {
		names = append(names, name)
	}
	return strings.Join(names, ", ")
}

var rootCmd = &cobra.Command{
	Use:   "new-api-deployer",
	Short: "Deploy channels and models to new-api via REST API",
	Long: `new-api-deployer is a CLI tool that automates channel and model management
on a new-api gateway instance through its REST API, without touching the web UI.

Core operations:
  add-channel     Create a new channel (models become user-accessible instantly)
  test-channel    Test channel connectivity and key validity
  verify-model    End-to-end verify a model responds to a chat request
  list-models     List models visible to a user token

Authentication:
  Admin operations (add-channel, test-channel) require a Personal Access Token (PAT)
  from an admin/root user. Relay operations (verify-model, list-models) require a
  user API key (sk-...).

  Set credentials via flags or environment variables:
    NEW_API_SERVER      Server base URL
    NEW_API_TOKEN       Admin PAT
    NEW_API_USER_TOKEN  User API key (sk-...)`,
	SilenceUsage:  true,
	SilenceErrors: true,
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&globalFlags.Server, "server", "s", "", "new-api server URL (env: NEW_API_SERVER)")
	rootCmd.PersistentFlags().StringVarP(&globalFlags.Token, "token", "t", "", "admin Personal Access Token (env: NEW_API_TOKEN)")
	rootCmd.PersistentFlags().StringVar(&globalFlags.UserToken, "user-token", "", "user API key sk-... (env: NEW_API_USER_TOKEN)")
}

func Execute() error {
	return rootCmd.Execute()
}

func resolveGlobalFlags() error {
	if globalFlags.Server == "" {
		globalFlags.Server = os.Getenv("NEW_API_SERVER")
	}
	if globalFlags.Token == "" {
		globalFlags.Token = os.Getenv("NEW_API_TOKEN")
	}
	if globalFlags.UserToken == "" {
		globalFlags.UserToken = os.Getenv("NEW_API_USER_TOKEN")
	}
	if globalFlags.Server == "" {
		return fmt.Errorf("server URL is required (use --server or set NEW_API_SERVER)")
	}
	return nil
}

func newClient() (*Client, error) {
	if err := resolveGlobalFlags(); err != nil {
		return nil, err
	}
	return NewClient(globalFlags.Server, globalFlags.Token, globalFlags.UserToken), nil
}

func requireAdminToken() error {
	if err := resolveGlobalFlags(); err != nil {
		return err
	}
	if globalFlags.Token == "" {
		return fmt.Errorf("admin token is required (use --token or set NEW_API_TOKEN)")
	}
	return nil
}

func requireUserToken() error {
	if err := resolveGlobalFlags(); err != nil {
		return err
	}
	if globalFlags.UserToken == "" {
		return fmt.Errorf("user token is required (use --user-token or set NEW_API_USER_TOKEN)")
	}
	return nil
}
