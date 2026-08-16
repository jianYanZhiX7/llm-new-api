package main

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"
)

var verifyModelFlags struct {
	MaxTokens int
	Prompt    string
}

var verifyModelCmd = &cobra.Command{
	Use:   "verify-model <model-name>",
	Short: "End-to-end verify a model responds to a chat request",
	Long: `Send a minimal chat completion request to the specified model through the
relay API. A successful response confirms the model is published, routed,
and billed correctly.

Uses the user token (sk-...) for authentication, exactly like a real caller.`,
	Args: cobra.ExactArgs(1),
	PreRunE: func(cmd *cobra.Command, args []string) error {
		return requireUserToken()
	},
	RunE: runVerifyModel,
}

func init() {
	verifyModelCmd.Flags().IntVar(&verifyModelFlags.MaxTokens, "max-tokens", 5, "max tokens for the test response")
	verifyModelCmd.Flags().StringVar(&verifyModelFlags.Prompt, "prompt", "ping", "test prompt message")
	rootCmd.AddCommand(verifyModelCmd)
}

func runVerifyModel(cmd *cobra.Command, args []string) error {
	model := args[0]

	client, err := newClient()
	if err != nil {
		return err
	}

	raw, err := client.ChatCompletion(model, verifyModelFlags.Prompt, verifyModelFlags.MaxTokens)
	if err != nil {
		return err
	}

	var result map[string]any
	if err := json.Unmarshal(raw, &result); err != nil {
		return fmt.Errorf("decode chat completion response: %w (body: %s)", err, truncate(string(raw), 200))
	}

	if errMsg, ok := result["error"].(map[string]any); ok {
		code, _ := errMsg["code"]
		message, _ := errMsg["message"].(string)
		fmt.Printf("Model %q: FAILED\n", model)
		fmt.Printf("  Error code: %v\n", code)
		fmt.Printf("  Message:    %s\n", message)
		return fmt.Errorf("model verification failed")
	}

	choices, _ := result["choices"].([]any)
	if len(choices) == 0 {
		fmt.Printf("Model %q: response received (no choices)\n", model)
		fmt.Printf("  Raw: %s\n", truncate(string(raw), 300))
		return nil
	}

	first, _ := choices[0].(map[string]any)
	message, _ := first["message"].(map[string]any)
	content, _ := message["content"].(string)

	fmt.Printf("Model %q: OK\n", model)
	fmt.Printf("  Response: %s\n", truncate(content, 200))

	if usage, ok := result["usage"].(map[string]any); ok {
		prompt, _ := usage["prompt_tokens"].(float64)
		completion, _ := usage["completion_tokens"].(float64)
		fmt.Printf("  Tokens:   prompt=%v completion=%v\n", prompt, completion)
	}
	return nil
}
