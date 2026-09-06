package setting

import (
	_ "embed"
	"slices"

	"github.com/QuantumNous/new-api/common"
)

//go:embed deepchat_model_config.json
var deepchatModelConfigRaw []byte

type deepchatModelConfig struct {
	Default string   `json:"default"`
	Models  []string `json:"models"`
}

var deepchatConfig = loadDeepchatModelConfig()

func loadDeepchatModelConfig() deepchatModelConfig {
	var cfg deepchatModelConfig
	if err := common.Unmarshal(deepchatModelConfigRaw, &cfg); err != nil {
		common.SysLog("failed to load deepchat_model_config.json: " + err.Error())
	}
	return cfg
}

func IsDeepchatModel(name string) bool {
	return slices.Contains(deepchatConfig.Models, name)
}

func IsDeepchatDefaultModel(name string) bool {
	return deepchatConfig.Default != "" && name == deepchatConfig.Default
}
