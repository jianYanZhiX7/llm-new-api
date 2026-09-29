package main

import (
	"encoding/json"
	"fmt"
)

type relayEndpoint struct {
	Name     string
	Path     string
	Headers  func(userToken string) map[string]string
	Validate func(body []byte) error
}

var relayEndpoints = []relayEndpoint{
	{
		Name: "openai",
		Path: "/v1/chat/completions",
		Headers: func(userToken string) map[string]string {
			return map[string]string{"Authorization": "Bearer " + userToken}
		},
		Validate: validateOpenAIResponse,
	},
	{
		Name: "anthropic",
		Path: "/v1/messages",
		Headers: func(userToken string) map[string]string {
			return map[string]string{
				"x-api-key":         userToken,
				"anthropic-version": "2023-06-01",
			}
		},
		Validate: validateAnthropicResponse,
	},
}

type relayError struct {
	Code    any    `json:"code"`
	Message string `json:"message"`
}

func (e *relayError) Error() string {
	if code, ok := e.Code.(string); ok && code != "" {
		return code + ": " + e.Message
	}
	return e.Message
}

func validateOpenAIResponse(body []byte) error {
	var response struct {
		Error   *relayError       `json:"error"`
		Choices []json.RawMessage `json:"choices"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		return fmt.Errorf("unparseable response: %s", truncate(string(body), 120))
	}
	if response.Error != nil {
		return response.Error
	}
	if len(response.Choices) == 0 {
		return fmt.Errorf("response carries no choices")
	}
	return nil
}

func validateAnthropicResponse(body []byte) error {
	var response struct {
		Type    string            `json:"type"`
		Error   *relayError       `json:"error"`
		Content []json.RawMessage `json:"content"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		return fmt.Errorf("unparseable response: %s", truncate(string(body), 120))
	}
	if response.Error != nil {
		return response.Error
	}
	if response.Type != "message" {
		return fmt.Errorf("expected a message response, got type %q", response.Type)
	}
	if len(response.Content) == 0 {
		return fmt.Errorf("message carries no content blocks")
	}
	return nil
}

func relayErrorDetail(body []byte) string {
	var payload struct {
		Error *relayError `json:"error"`
	}
	if err := json.Unmarshal(body, &payload); err == nil && payload.Error != nil {
		return payload.Error.Error()
	}
	return truncate(string(body), 200)
}
