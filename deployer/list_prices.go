package main

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
)

var listPricesCmd = &cobra.Command{
	Use:   "list-prices",
	Short: "Display current pricing in USD per 1M tokens",
	Long: `Fetch pricing-related option values from the server and display them in
USD per 1M tokens, the same convention as the web pricing page
(ratio 1 = $0.002/1K tokens = $2/1M tokens).`,
	PreRunE: func(cmd *cobra.Command, args []string) error {
		return requireAdminToken()
	},
	RunE: runListPrices,
}

func init() {
	rootCmd.AddCommand(listPricesCmd)
}

func formatUSD(v float64) string {
	s := strconv.FormatFloat(v, 'f', 4, 64)
	s = strings.TrimRight(s, "0")
	s = strings.TrimRight(s, ".")
	return "$" + s
}

type modelPricing struct {
	input     float64
	hasInput  bool
	output    float64
	hasOutput bool
	cacheR    float64
	hasCacheR bool
	cacheW    float64
	hasCacheW bool
}

func runListPrices(cmd *cobra.Command, args []string) error {
	client, err := newClient()
	if err != nil {
		return err
	}

	optionMap, err := client.GetOptionMap()
	if err != nil {
		return err
	}

	ratioMap := parseRatioMapOrNote(optionMap["ModelRatio"])
	completionMap := parseRatioMapOrNote(optionMap["CompletionRatio"])
	cacheReadMap := parseRatioMapOrNote(optionMap["CacheRatio"])
	cacheWriteMap := parseRatioMapOrNote(optionMap["CreateCacheRatio"])
	fixedMap := parseRatioMapOrNote(optionMap["ModelPrice"])
	groupMap := parseRatioMapOrNote(optionMap["GroupRatio"])

	// ratio 1 = $0.002/1K tokens = $2/1M tokens (same convention as the web pricing page)
	const usdPer1MPerRatio = 2

	merged := map[string]*modelPricing{}
	get := func(model string) *modelPricing {
		p, ok := merged[model]
		if !ok {
			p = &modelPricing{}
			merged[model] = p
		}
		return p
	}
	for model, ratio := range ratioMap {
		p := get(model)
		p.input = ratio * usdPer1MPerRatio
		p.hasInput = true
		completion, ok := completionMap[model]
		if !ok {
			completion = 1
		}
		p.output = p.input * completion
		p.hasOutput = true
	}
	for model, r := range cacheReadMap {
		p := get(model)
		if p.hasInput {
			p.cacheR = p.input * r
			p.hasCacheR = true
		}
	}
	for model, r := range cacheWriteMap {
		p := get(model)
		if p.hasInput {
			p.cacheW = p.input * r
			p.hasCacheW = true
		}
	}

	names := make([]string, 0, len(merged))
	for name := range merged {
		names = append(names, name)
	}
	sort.Strings(names)

	fmt.Printf("\nToken pricing (USD per 1M tokens; same convention as the web pricing page)\n")
	fmt.Printf("  %-45s %-12s %-12s %-12s %s\n", "MODEL", "INPUT", "OUTPUT", "CACHE_READ", "CACHE_WRITE")
	for _, name := range names {
		p := merged[name]
		input, output := "-", "-"
		if p.hasInput {
			input = formatUSD(p.input)
		}
		if p.hasOutput {
			output = formatUSD(p.output)
		}
		cacheR, cacheW := "-", "-"
		if p.hasCacheR {
			cacheR = formatUSD(p.cacheR)
		}
		if p.hasCacheW {
			cacheW = formatUSD(p.cacheW)
		}
		fmt.Printf("  %-45s %-12s %-12s %-12s %s\n", name, input, output, cacheR, cacheW)
	}
	fmt.Printf("\n  Note: OUTPUT uses the configured completion ratio (default 1x input).\n")
	fmt.Printf("  The server hardcodes completion ratios for some families (gpt-*, claude-*,\n")
	fmt.Printf("  gemini-*, o1/o3, mistral-*, command*); their real output price may differ.\n")

	fixedNames := sortedKeys(fixedMap)
	if len(fixedNames) > 0 {
		fmt.Printf("\nFixed per-call pricing (USD per request)\n")
		fmt.Printf("  %-45s %s\n", "MODEL", "PRICE")
		for _, name := range fixedNames {
			fmt.Printf("  %-45s %s\n", name, formatUSD(fixedMap[name]))
		}
	}

	groupNames := sortedKeys(groupMap)
	if len(groupNames) > 0 {
		fmt.Printf("\nGroup multipliers (applied on top of model prices)\n")
		fmt.Printf("  %-45s %s\n", "GROUP", "MULTIPLIER")
		for _, name := range groupNames {
			fmt.Printf("  %-45s %vx\n", name, strconv.FormatFloat(groupMap[name], 'f', -1, 64))
		}
	}

	return nil
}

func parseRatioMapOrNote(raw string) map[string]float64 {
	m, err := parseRatioMap(raw)
	if err != nil {
		fmt.Printf("  (unparseable option value: %v)\n", err)
		return map[string]float64{}
	}
	return m
}

func sortedKeys(m map[string]float64) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
