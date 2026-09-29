package main

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/spf13/cobra"
)

const probeColumnWidth = 24

var verifyEndpointsFlags struct {
	Prompt      string
	MaxTokens   int
	Concurrency int
}

var verifyEndpointsCmd = &cobra.Command{
	Use:   "verify-endpoints",
	Short: "Verify every published model against every relay endpoint",
	Long: `Fetch the model list visible to the user token, then send one minimal request
per model to each relay endpoint (OpenAI /v1/chat/completions and Anthropic
/v1/messages). A model counts as usable only when both endpoints answer with a
valid payload.

Credentials come from --server/--user-token or NEW_API_SERVER/NEW_API_USER_TOKEN.
The command exits non-zero when any check fails.`,
	PreRunE: func(cmd *cobra.Command, args []string) error {
		return requireUserToken()
	},
	RunE: runVerifyEndpoints,
}

func init() {
	verifyEndpointsCmd.Flags().StringVar(&verifyEndpointsFlags.Prompt, "prompt", "ping", "test prompt message")
	verifyEndpointsCmd.Flags().IntVar(&verifyEndpointsFlags.MaxTokens, "max-tokens", 5, "max tokens for the test response")
	verifyEndpointsCmd.Flags().IntVar(&verifyEndpointsFlags.Concurrency, "concurrency", 4, "number of endpoints probed in parallel")
	rootCmd.AddCommand(verifyEndpointsCmd)
}

type probeResult struct {
	Model      string
	Endpoint   string
	OK         bool
	StatusCode int
	Detail     string
	Latency    time.Duration
}

func runVerifyEndpoints(cmd *cobra.Command, args []string) error {
	if verifyEndpointsFlags.Concurrency < 1 {
		return fmt.Errorf("--concurrency must be at least 1")
	}

	client, err := newClient()
	if err != nil {
		return err
	}

	models, err := client.ListModels()
	if err != nil {
		return err
	}
	if len(models) == 0 {
		fmt.Printf("No models are visible to this token on %s\n", client.Server)
		return nil
	}

	fmt.Printf("Probing %d models on %d endpoints at %s\n\n", len(models), len(relayEndpoints), client.Server)

	results := probeAllModels(client, models)
	printProbeTable(models, results)
	return summarizeProbes(results)
}

func probeAllModels(client *Client, models []string) []probeResult {
	endpoints := len(relayEndpoints)
	results := make([]probeResult, len(models)*endpoints)

	workers := verifyEndpointsFlags.Concurrency
	if workers > len(results) {
		workers = len(results)
	}

	jobs := make(chan int)
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for index := range jobs {
				results[index] = probeModel(client, models[index/endpoints], relayEndpoints[index%endpoints])
			}
		}()
	}
	for index := range results {
		jobs <- index
	}
	close(jobs)
	wg.Wait()
	return results
}

func probeModel(client *Client, model string, endpoint relayEndpoint) probeResult {
	payload := map[string]any{
		"model":      model,
		"max_tokens": verifyEndpointsFlags.MaxTokens,
		"messages": []map[string]string{
			{"role": "user", "content": verifyEndpointsFlags.Prompt},
		},
	}

	started := time.Now()
	status, body, err := client.relayRaw("POST", endpoint.Path, payload, endpoint.Headers(client.UserToken))
	result := probeResult{
		Model:      model,
		Endpoint:   endpoint.Name,
		StatusCode: status,
		Latency:    time.Since(started),
	}
	if err != nil {
		result.Detail = err.Error()
		return result
	}
	if status < 200 || status >= 300 {
		result.Detail = fmt.Sprintf("HTTP %d: %s", status, relayErrorDetail(body))
		return result
	}
	if err := endpoint.Validate(body); err != nil {
		result.Detail = err.Error()
		return result
	}
	result.OK = true
	return result
}

func printProbeTable(models []string, results []probeResult) {
	endpoints := len(relayEndpoints)
	nameWidth := len("MODEL")
	for _, model := range models {
		if len(model) > nameWidth {
			nameWidth = len(model)
		}
	}

	header := padRight("MODEL", nameWidth)
	for _, endpoint := range relayEndpoints {
		header += "  " + padRight(endpoint.Name, probeColumnWidth)
	}
	fmt.Println(header)
	fmt.Println(strings.Repeat("-", len(header)))

	failures := make([]probeResult, 0)
	for i, model := range models {
		line := padRight(model, nameWidth)
		for j := 0; j < endpoints; j++ {
			result := results[i*endpoints+j]
			line += "  " + padRight(probeCell(result), probeColumnWidth)
			if !result.OK {
				failures = append(failures, result)
			}
		}
		fmt.Println(strings.TrimRight(line, " "))
	}

	if len(failures) == 0 {
		return
	}
	fmt.Printf("\nFailures (%d)\n", len(failures))
	for _, result := range failures {
		fmt.Printf("  %s @ %s: %s\n", result.Model, result.Endpoint, result.Detail)
	}
}

func probeCell(result probeResult) string {
	if result.OK {
		return "ok " + result.Latency.Round(time.Millisecond).String()
	}
	if result.StatusCode == 0 {
		return "FAIL no response"
	}
	if result.StatusCode < 200 || result.StatusCode >= 300 {
		return fmt.Sprintf("FAIL HTTP %d", result.StatusCode)
	}
	return fmt.Sprintf("FAIL payload (%d)", result.StatusCode)
}

func summarizeProbes(results []probeResult) error {
	passed := 0
	for _, result := range results {
		if result.OK {
			passed++
		}
	}
	fmt.Printf("\n%d/%d endpoint checks passed\n", passed, len(results))
	if passed == len(results) {
		return nil
	}
	return fmt.Errorf("%d endpoint checks failed", len(results)-passed)
}

func padRight(s string, width int) string {
	if len(s) >= width {
		return s
	}
	return s + strings.Repeat(" ", width-len(s))
}
