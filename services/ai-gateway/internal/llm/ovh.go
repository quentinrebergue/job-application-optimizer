package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type OVHOptions struct {
	BaseURL        string
	Token          string
	Model          string
	AttemptTimeout time.Duration
	MaxRetries     int
	Backoff        time.Duration // first wait, doubled at each retry
}

type OVH struct {
	opts   OVHOptions
	client *http.Client
}

func NewOVH(opts OVHOptions) *OVH {
	return &OVH{opts: opts, client: &http.Client{Timeout: opts.AttemptTimeout}}
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model          string            `json:"model"`
	Messages       []chatMessage     `json:"messages"`
	MaxTokens      int               `json:"max_tokens"`
	Temperature    float64           `json:"temperature"`
	ResponseFormat map[string]string `json:"response_format"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
	Usage Usage `json:"usage"`
}

func (c *OVH) Complete(ctx context.Context, req Request) (Result, error) {
	var lastErr error
	for attempt := 0; attempt <= c.opts.MaxRetries; attempt++ {
		if attempt > 0 {
			wait := c.opts.Backoff * time.Duration(1<<(attempt-1))
			select {
			case <-time.After(wait):
			case <-ctx.Done():
				return Result{}, ctx.Err()
			}
		}
		res, retryable, err := c.once(ctx, req)
		if err == nil {
			return res, nil
		}
		lastErr = err
		if !retryable {
			return Result{}, err
		}
	}
	return Result{}, fmt.Errorf("giving up after %d attempts: %w", c.opts.MaxRetries+1, lastErr)
}

// once makes a single HTTP call. retryable is true for failures that may go
// away by themselves: network errors, 429 and 5xx.
func (c *OVH) once(ctx context.Context, req Request) (res Result, retryable bool, err error) {
	body, err := json.Marshal(chatRequest{
		Model: c.opts.Model,
		Messages: []chatMessage{
			{Role: "system", Content: req.System},
			{Role: "user", Content: req.Prompt},
		},
		MaxTokens:      req.MaxTokens,
		Temperature:    0,
		ResponseFormat: map[string]string{"type": "json_object"},
	})
	if err != nil {
		return Result{}, false, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		strings.TrimRight(c.opts.BaseURL, "/")+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return Result{}, false, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+c.opts.Token)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(httpReq)
	if err != nil {
		// Our own deadline expiring is final; anything else is worth a retry.
		return Result{}, ctx.Err() == nil, fmt.Errorf("call AI endpoint: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return Result{}, true, fmt.Errorf("read AI response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		retry := resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500
		snippet := string(raw)
		if len(snippet) > 200 {
			snippet = snippet[:200]
		}
		return Result{}, retry, fmt.Errorf("AI endpoint answered %d: %s", resp.StatusCode, snippet)
	}

	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return Result{}, false, fmt.Errorf("decode AI response: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return Result{}, false, errors.New("AI response has no choices")
	}
	return Result{Content: parsed.Choices[0].Message.Content, Usage: parsed.Usage}, false, nil
}
