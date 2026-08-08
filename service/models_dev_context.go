package service

import (
	"io"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const (
	modelsDevURL          = "https://models.dev/api.json"
	modelsDevCacheTTL     = time.Hour
	modelsDevFailTTL      = 5 * time.Minute
	modelsDevHTTPTimeout  = 15 * time.Second
	modelsDevMaxBodyBytes = 16 << 20
	defaultContextWindow  = 200000

	contextSourceDefault   = "default"
	contextSourceModelsDev = "models.dev"
)

var (
	modelsDevContextCache  map[string]int
	modelsDevCacheMu       sync.RWMutex
	modelsDevCacheExpireAt int64
	modelsDevHTTPClient    = &http.Client{Timeout: modelsDevHTTPTimeout}
	modelsDevRefreshing    atomic.Bool
)

type modelsDevProvider struct {
	Models map[string]struct {
		Limit *struct {
			Context int `json:"context"`
		} `json:"limit"`
	} `json:"models"`
}

func GetModelContextWindow(modelName string) (window *int, source string) {
	if modelName == "" {
		return nil, ""
	}

	now := time.Now().UnixNano()
	modelsDevCacheMu.RLock()
	cache := modelsDevContextCache
	expired := now >= modelsDevCacheExpireAt
	modelsDevCacheMu.RUnlock()

	if expired {
		maybeRefreshModelsDevCache()
	}

	if cache != nil {
		if v, ok := cache[modelName]; ok && v > 0 {
			return &v, contextSourceModelsDev
		}
	}

	dv := defaultContextWindow
	return &dv, contextSourceDefault
}

func maybeRefreshModelsDevCache() {
	if !modelsDevRefreshing.CompareAndSwap(false, true) {
		return
	}
	go func() {
		defer modelsDevRefreshing.Store(false)
		refreshModelsDevContextCache()
	}()
}

func refreshModelsDevContextCache() {
	resp, err := modelsDevHTTPClient.Get(modelsDevURL)
	if err != nil {
		setModelsDevCacheExpiry(modelsDevFailTTL)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		setModelsDevCacheExpiry(modelsDevFailTTL)
		return
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, modelsDevMaxBodyBytes))
	if err != nil {
		setModelsDevCacheExpiry(modelsDevFailTTL)
		return
	}

	var parsed map[string]modelsDevProvider
	if err := common.Unmarshal(body, &parsed); err != nil {
		setModelsDevCacheExpiry(modelsDevFailTTL)
		return
	}

	cache := make(map[string]int, 256)
	for _, provider := range parsed {
		for modelName, m := range provider.Models {
			if m.Limit == nil || m.Limit.Context <= 0 {
				continue
			}
			if _, exists := cache[modelName]; !exists {
				cache[modelName] = m.Limit.Context
			}
		}
	}

	modelsDevCacheMu.Lock()
	modelsDevContextCache = cache
	modelsDevCacheExpireAt = time.Now().Add(modelsDevCacheTTL).UnixNano()
	modelsDevCacheMu.Unlock()
}

func setModelsDevCacheExpiry(ttl time.Duration) {
	modelsDevCacheMu.Lock()
	if modelsDevContextCache == nil {
		modelsDevContextCache = map[string]int{}
	}
	modelsDevCacheExpireAt = time.Now().Add(ttl).UnixNano()
	modelsDevCacheMu.Unlock()
}
