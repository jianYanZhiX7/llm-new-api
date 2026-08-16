package main

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

var listModelsCmd = &cobra.Command{
	Use:   "list-models",
	Short: "List models visible to the user token (via /v1/models)",
	Long: `Query the relay /v1/models endpoint and print every model ID currently
accessible to the provided user token. This reflects the abilities
generated from all enabled channels for the user's group.`,
	PreRunE: func(cmd *cobra.Command, args []string) error {
		return requireUserToken()
	},
	RunE: runListModels,
}

func init() {
	rootCmd.AddCommand(listModelsCmd)
}

func runListModels(cmd *cobra.Command, args []string) error {
	client, err := newClient()
	if err != nil {
		return err
	}

	models, err := client.ListModels()
	if err != nil {
		return err
	}

	if len(models) == 0 {
		fmt.Println("No models available for this token.")
		return nil
	}

	fmt.Printf("Available models (%d):\n", len(models))
	for i, m := range models {
		fmt.Printf("  %3d. %s\n", i+1, m)
	}

	joined := strings.Join(models, ", ")
	fmt.Printf("\nAll: %s\n", truncate(joined, 500))
	return nil
}
