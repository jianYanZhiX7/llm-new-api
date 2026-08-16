package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

type OptionEntry struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

var pricingOptionKeys = []string{
	"ModelRatio",
	"ModelPrice",
	"CompletionRatio",
	"CacheRatio",
	"CreateCacheRatio",
	"ImageRatio",
	"AudioRatio",
	"AudioCompletionRatio",
	"GroupRatio",
}

func (c *Client) GetOptionMap() (map[string]string, error) {
	resp, err := c.adminDo("GET", "/api/option/", nil)
	if err != nil {
		return nil, err
	}
	var entries []OptionEntry
	if err := json.Unmarshal(resp.Data, &entries); err != nil {
		return nil, fmt.Errorf("decode options: %w", err)
	}
	m := make(map[string]string, len(entries))
	for _, e := range entries {
		m[e.Key] = e.Value
	}
	return m, nil
}

func (c *Client) UpdateOption(key, jsonValue string) error {
	payload := map[string]any{
		"key":   key,
		"value": jsonValue,
	}
	resp, err := c.adminDo("PUT", "/api/option/", payload)
	if err != nil {
		return err
	}
	if !resp.Success {
		return fmt.Errorf("update option %s failed: %s", key, resp.Message)
	}
	return nil
}

func parseRatioMap(raw string) (map[string]float64, error) {
	m := make(map[string]float64)
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return m, nil
	}
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		return nil, fmt.Errorf("parse option value %q (invalid or non-numeric JSON): %w", truncate(raw, 100), err)
	}
	return m, nil
}

func mergeAndMarshal(raw string, key string, value float64) (string, error) {
	m, err := parseRatioMap(raw)
	if err != nil {
		return "", err
	}
	m[key] = value
	out, err := json.Marshal(m)
	if err != nil {
		return "", fmt.Errorf("encode option value: %w", err)
	}
	return string(out), nil
}
