package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

var setPriceFlags struct {
	Model       string
	Group       string
	Ratio       float64
	Completion  float64
	Price       float64
	Cache       float64
	CreateCache float64
}

var setPriceCmd = &cobra.Command{
	Use:   "set-price",
	Short: "Set model or group pricing (requires Root PAT)",
	Long: `Configure pricing via the admin option API.

The server API stores ratios internally; list-prices and the web pricing
page convert them to USD per 1M tokens (ratio N = $2N/1M tokens = $0.002N/1K).

Model pricing:
  --ratio        input token ratio (ratio 1 = $2/1M tokens, so --ratio 0.5
                 means $1/1M input). 0 = free
  --completion   output multiplier relative to input (e.g. 4 = 4x input price)
  --price        fixed per-call price in USD (mutually exclusive with --ratio,
                 --completion, --cache and --create-cache)
  --cache        cache-read multiplier (e.g. 0.1 = 10% of input)
  --create-cache cache-write multiplier (e.g. 1.25 = 125% of input)

Example: $1/1M input ($0.5 ratio) with output at 4x:
  set-price --model gpt-4o --ratio 0.5 --completion 4

Group pricing:
  --ratio        group multiplier (e.g. 0.8 = 20% discount)

Existing entries are merged, not overwritten. Only the specified model/group
entry is updated; all others remain unchanged.

Note: the update is a read-merge-write of the whole option map; concurrent
edits to the same option on the server may be lost.

Requires a Root-level PAT.`,
	PreRunE: func(cmd *cobra.Command, args []string) error {
		return requireAdminToken()
	},
	RunE: runSetPrice,
}

func init() {
	flags := setPriceCmd.Flags()
	flags.StringVar(&setPriceFlags.Model, "model", "", "model name to price")
	flags.StringVar(&setPriceFlags.Group, "group", "", "user group name to price")
	flags.Float64Var(&setPriceFlags.Ratio, "ratio", 0, "model ratio or group ratio")
	flags.Float64Var(&setPriceFlags.Completion, "completion", 0, "completion (output) ratio")
	flags.Float64Var(&setPriceFlags.Price, "price", 0, "fixed per-call price")
	flags.Float64Var(&setPriceFlags.Cache, "cache", 0, "cache-read ratio")
	flags.Float64Var(&setPriceFlags.CreateCache, "create-cache", 0, "cache-write ratio")
	rootCmd.AddCommand(setPriceCmd)
}

func runSetPrice(cmd *cobra.Command, args []string) error {
	if setPriceFlags.Model == "" && setPriceFlags.Group == "" {
		return fmt.Errorf("must specify --model or --group")
	}
	if setPriceFlags.Model != "" && setPriceFlags.Group != "" {
		return fmt.Errorf("cannot specify both --model and --group")
	}

	isModel := setPriceFlags.Model != ""
	changed := func(name string) bool { return cmd.Flags().Changed(name) }

	if isModel {
		ratioLike := changed("ratio") || changed("completion") || changed("cache") || changed("create-cache")
		switch {
		case changed("price") && ratioLike:
			return fmt.Errorf("--price is mutually exclusive with --ratio, --completion, --cache and --create-cache (a fixed ModelPrice overrides ratio-based billing)")
		case !changed("price") && !ratioLike:
			return fmt.Errorf("no pricing flags specified (use --ratio, --completion, --price, --cache, or --create-cache)")
		}
	} else {
		if !changed("ratio") {
			return fmt.Errorf("group pricing requires --ratio")
		}
	}

	client, err := newClient()
	if err != nil {
		return err
	}

	optionMap, err := client.GetOptionMap()
	if err != nil {
		return err
	}

	if isModel {
		return setModelPricing(cmd, client, optionMap, setPriceFlags.Model)
	}
	return setGroupPricing(client, optionMap, setPriceFlags.Group)
}

func setModelPricing(cmd *cobra.Command, client *Client, optionMap map[string]string, model string) error {
	updates := []struct {
		flagName  string
		optionKey string
		value     float64
		label     string
	}{
		{"ratio", "ModelRatio", setPriceFlags.Ratio, "model ratio"},
		{"completion", "CompletionRatio", setPriceFlags.Completion, "completion ratio"},
		{"price", "ModelPrice", setPriceFlags.Price, "fixed price"},
		{"cache", "CacheRatio", setPriceFlags.Cache, "cache ratio"},
		{"create-cache", "CreateCacheRatio", setPriceFlags.CreateCache, "create-cache ratio"},
	}

	applied := make([]priceUpdate, 0, len(updates))
	for _, u := range updates {
		if !cmd.Flags().Changed(u.flagName) {
			continue
		}
		merged, err := mergeAndMarshal(optionMap[u.optionKey], model, u.value)
		if err != nil {
			return fmt.Errorf("refusing to update option %s: %w", u.optionKey, err)
		}
		applied = append(applied, priceUpdate{optionKey: u.optionKey, merged: merged, value: u.value, label: u.label})
	}

	for _, u := range applied {
		if err := client.UpdateOption(u.optionKey, u.merged); err != nil {
			return fmt.Errorf("set %s for %s: %w", u.label, model, err)
		}
		fmt.Printf("  %s: %s = %v\n", model, u.label, u.value)
	}

	fmt.Printf("Pricing updated for model %q\n", model)
	return nil
}

type priceUpdate struct {
	optionKey string
	merged    string
	value     float64
	label     string
}

func setGroupPricing(client *Client, optionMap map[string]string, group string) error {
	merged, err := mergeAndMarshal(optionMap["GroupRatio"], group, setPriceFlags.Ratio)
	if err != nil {
		return fmt.Errorf("refusing to update option GroupRatio: %w", err)
	}
	if err := client.UpdateOption("GroupRatio", merged); err != nil {
		return fmt.Errorf("set group ratio for %s: %w", group, err)
	}
	fmt.Printf("  %s: group ratio = %v\n", group, setPriceFlags.Ratio)
	fmt.Printf("Pricing updated for group %q\n", group)
	return nil
}
