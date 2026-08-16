package main

import (
	"fmt"
	"strconv"

	"github.com/spf13/cobra"
)

var testChannelCmd = &cobra.Command{
	Use:   "test-channel <channel-id>",
	Short: "Test channel connectivity and key validity",
	Long: `Trigger a connectivity test for the given channel. This calls the admin
test endpoint which sends a lightweight request to the upstream provider
and reports the response time and any errors.`,
	Args: cobra.ExactArgs(1),
	PreRunE: func(cmd *cobra.Command, args []string) error {
		return requireAdminToken()
	},
	RunE: runTestChannel,
}

func init() {
	rootCmd.AddCommand(testChannelCmd)
}

func runTestChannel(cmd *cobra.Command, args []string) error {
	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid channel ID %q: must be a number", args[0])
	}

	client, err := newClient()
	if err != nil {
		return err
	}

	result, err := client.TestChannel(id)
	if err != nil {
		if result != nil && result.ErrorCode != 0 {
			fmt.Printf("Channel %d test result: FAILED (error_code: %d)\n", id, result.ErrorCode)
		}
		return err
	}

	fmt.Printf("Channel %d test result: OK\n", id)
	fmt.Printf("  Time: %.2fs\n", result.Time)
	if result.Message != "" {
		fmt.Printf("  Message: %s\n", result.Message)
	}
	return nil
}
