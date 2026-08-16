package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	Server    string
	Token     string
	UserToken string
	HTTP      *http.Client
}

func NewClient(server, token, userToken string) *Client {
	return &Client{
		Server:    strings.TrimRight(server, "/"),
		Token:     token,
		UserToken: userToken,
		HTTP:      &http.Client{Timeout: 120 * time.Second},
	}
}

type APIResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

type TestResult struct {
	Success   bool    `json:"success"`
	Message   string  `json:"message"`
	Time      float64 `json:"time"`
	ErrorCode int     `json:"error_code"`
}

func (c *Client) newRequest(method, path string, body any, token string) (*http.Request, error) {
	var bodyReader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(raw)
	}
	req, err := http.NewRequest(method, c.Server+path, bodyReader)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+token)
	return req, nil
}

func (c *Client) adminDo(method, path string, body any) (*APIResponse, error) {
	req, err := c.newRequest(method, path, body, c.Token)
	if err != nil {
		return nil, err
	}
	raw, err := c.execute(req)
	if err != nil {
		return nil, err
	}
	var apiResp APIResponse
	if err := json.Unmarshal(raw, &apiResp); err != nil {
		return nil, fmt.Errorf("decode response: %w (body: %s)", err, truncate(string(raw), 200))
	}
	return &apiResp, nil
}

func (c *Client) relayDo(method, path string, body any) (json.RawMessage, error) {
	req, err := c.newRequest(method, path, body, c.UserToken)
	if err != nil {
		return nil, err
	}
	return c.execute(req)
}

func (c *Client) execute(req *http.Request) ([]byte, error) {
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, truncate(string(raw), 500))
	}
	return raw, nil
}

func (c *Client) AddChannel(channel map[string]any) (int, error) {
	payload := map[string]any{
		"mode":    "single",
		"channel": channel,
	}
	resp, err := c.adminDo("POST", "/api/channel/", payload)
	if err != nil {
		return 0, err
	}
	if !resp.Success {
		return 0, fmt.Errorf("add channel failed: %s", resp.Message)
	}
	name, _ := channel["name"].(string)
	return c.findChannelIdByName(name)
}

func (c *Client) findChannelIdByName(name string) (int, error) {
	resp, err := c.adminDo("GET", "/api/channel/search?keyword="+url.QueryEscape(name), nil)
	if err != nil {
		return 0, fmt.Errorf("channel created, but failed to look up its ID by name %q: %w", name, err)
	}
	var channels []struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
	}
	if err := json.Unmarshal(resp.Data, &channels); err != nil {
		return 0, fmt.Errorf("channel created, but failed to decode ID lookup result: %w", err)
	}
	id := 0
	for _, ch := range channels {
		if ch.Name == name && ch.ID > id {
			id = ch.ID
		}
	}
	if id == 0 {
		return 0, fmt.Errorf("channel created, but no channel named %q was found; look up its ID in the admin UI", name)
	}
	return id, nil
}

func (c *Client) TestChannel(id int) (*TestResult, error) {
	req, err := c.newRequest("GET", fmt.Sprintf("/api/channel/test/%d", id), nil, c.Token)
	if err != nil {
		return nil, err
	}
	raw, err := c.execute(req)
	if err != nil {
		return nil, err
	}
	var result TestResult
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("decode test result: %w", err)
	}
	if !result.Success {
		return &result, fmt.Errorf("test channel failed: %s", result.Message)
	}
	return &result, nil
}

func (c *Client) ListModels() ([]string, error) {
	raw, err := c.relayDo("GET", "/v1/models", nil)
	if err != nil {
		return nil, err
	}
	var result struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("decode models: %w", err)
	}
	models := make([]string, 0, len(result.Data))
	for _, m := range result.Data {
		models = append(models, m.ID)
	}
	return models, nil
}

func (c *Client) ChatCompletion(model, prompt string, maxTokens int) (json.RawMessage, error) {
	payload := map[string]any{
		"model":      model,
		"max_tokens": maxTokens,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}
	return c.relayDo("POST", "/v1/chat/completions", payload)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
