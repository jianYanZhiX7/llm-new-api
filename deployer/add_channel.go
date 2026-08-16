package main

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

var addChannelFlags struct {
	Type     string
	Name     string
	Key      string
	BaseURL  string
	Models   string
	Group    string
	Priority int
	Weight   int
	AutoBan  bool
	Tag      string
	Status   int
	ModelMap string
	Remark   string
}

var addChannelCmd = &cobra.Command{
	Use:   "add-channel",
	Short: "Create a new channel and publish its models",
	Long: `Create a new channel via the admin API. The specified models become immediately
accessible to the configured user groups (abilities are auto-generated).

Use --type with a name (e.g. "openai") or a numeric ID.
Use --models with a comma-separated list (e.g. "gpt-4o,gpt-4o-mini").`,
	PreRunE: func(cmd *cobra.Command, args []string) error {
		return requireAdminToken()
	},
	RunE: runAddChannel,
}

func init() {
	flags := addChannelCmd.Flags()
	flags.StringVar(&addChannelFlags.Type, "type", "", "channel type: name (openai, anthropic, gemini, ...) or numeric ID (required)")
	flags.StringVar(&addChannelFlags.Name, "name", "", "channel name (required)")
	flags.StringVar(&addChannelFlags.Key, "key", "", "upstream API key (required)")
	flags.StringVar(&addChannelFlags.BaseURL, "base-url", "", "upstream base URL (defaults to channel type default)")
	flags.StringVar(&addChannelFlags.Models, "models", "", "comma-separated model names to publish (required)")
	flags.StringVar(&addChannelFlags.Group, "group", "default", "comma-separated user groups that can use these models")
	flags.IntVar(&addChannelFlags.Priority, "priority", 0, "routing priority (higher = preferred)")
	flags.IntVar(&addChannelFlags.Weight, "weight", 1, "load-balancing weight within same priority")
	flags.BoolVar(&addChannelFlags.AutoBan, "auto-ban", true, "auto-disable channel on upstream errors")
	flags.StringVar(&addChannelFlags.Tag, "tag", "", "channel tag for grouping")
	flags.IntVar(&addChannelFlags.Status, "status", 1, "channel status: 1=enabled, 2=disabled")
	flags.StringVar(&addChannelFlags.ModelMap, "model-mapping", "", "JSON object mapping client model names to upstream model names")
	flags.StringVar(&addChannelFlags.Remark, "remark", "", "admin remark note")

	_ = addChannelCmd.MarkFlagRequired("type")
	_ = addChannelCmd.MarkFlagRequired("name")
	_ = addChannelCmd.MarkFlagRequired("key")
	_ = addChannelCmd.MarkFlagRequired("models")

	rootCmd.AddCommand(addChannelCmd)
}

func runAddChannel(cmd *cobra.Command, args []string) error {
	channelType, err := resolveChannelType(addChannelFlags.Type)
	if err != nil {
		return err
	}

	channel := map[string]any{
		"type":     channelType,
		"name":     addChannelFlags.Name,
		"key":      addChannelFlags.Key,
		"models":   addChannelFlags.Models,
		"group":    addChannelFlags.Group,
		"priority": addChannelFlags.Priority,
		"weight":   addChannelFlags.Weight,
		"auto_ban": boolToInt(addChannelFlags.AutoBan),
		"status":   addChannelFlags.Status,
	}

	if addChannelFlags.BaseURL != "" {
		channel["base_url"] = addChannelFlags.BaseURL
	}
	if addChannelFlags.Tag != "" {
		channel["tag"] = addChannelFlags.Tag
	}
	if addChannelFlags.Remark != "" {
		channel["remark"] = addChannelFlags.Remark
	}
	if addChannelFlags.ModelMap != "" {
		var mm map[string]string
		if err := json.Unmarshal([]byte(addChannelFlags.ModelMap), &mm); err != nil {
			return fmt.Errorf("invalid --model-mapping JSON: %w", err)
		}
		raw, err := json.Marshal(mm)
		if err != nil {
			return fmt.Errorf("encode --model-mapping JSON: %w", err)
		}
		channel["model_mapping"] = string(raw)
	}

	client, err := newClient()
	if err != nil {
		return err
	}

	id, err := client.AddChannel(channel)
	if err != nil {
		fmt.Println("Channel created successfully")
		fmt.Printf("  Name:    %s\n", addChannelFlags.Name)
		fmt.Printf("  Type:    %d\n", channelType)
		fmt.Printf("  Group:   %s\n", addChannelFlags.Group)
		return err
	}

	models := splitModels(addChannelFlags.Models)

	fmt.Printf("Channel created successfully\n")
	fmt.Printf("  ID:      %d\n", id)
	fmt.Printf("  Name:    %s\n", addChannelFlags.Name)
	fmt.Printf("  Type:    %d\n", channelType)
	fmt.Printf("  Group:   %s\n", addChannelFlags.Group)
	fmt.Printf("  Models:  %s\n", strings.Join(models, ", "))
	fmt.Printf("\nModels are now live for group(s): %s\n", addChannelFlags.Group)
	fmt.Printf("Next steps:\n")
	fmt.Printf("  Test channel:    new-api-deployer test-channel %d\n", id)
	fmt.Printf("  Verify model:    new-api-deployer verify-model %s\n", models[0])
	return nil
}

func splitModels(raw string) []string {
	parts := strings.Split(raw, ",")
	models := make([]string, 0, len(parts))
	for _, p := range parts {
		if m := strings.TrimSpace(p); m != "" {
			models = append(models, m)
		}
	}
	return models
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
