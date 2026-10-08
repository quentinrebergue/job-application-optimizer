package llm

import "context"

type Request struct {
	System    string
	Prompt    string
	MaxTokens int
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
}

type Result struct {
	Content string
	Usage   Usage
}

// Completer is anything that can answer a prompt with a JSON document.
type Completer interface {
	Complete(ctx context.Context, req Request) (Result, error)
}
