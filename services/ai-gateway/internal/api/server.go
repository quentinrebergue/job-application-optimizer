package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"sync/atomic"
	"time"
	"unicode/utf8"

	"github.com/quentinrebergue/job-application-optimizer/services/ai-gateway/internal/llm"
)

type Limits struct {
	// Disabled is the kill switch (AI_ENABLED=false): every completion is refused with a 503.
	// It is a "not" so that the zero value of Limits is a working gateway.
	Disabled bool
	// MaxPromptChars caps system + prompt, counted in characters (a "é" is one, not two).
	MaxPromptChars  int
	MaxOutputTokens int
	Timeout         time.Duration
}

// maxSchemaBytes caps the JSON Schema an app may send along with a prompt.
const maxSchemaBytes = 32 << 10

// Codes tell the app why a request was refused, so it can show its own message:
// the "error" text is for logs, never for users.
const (
	codeAIDisabled     = "ai_disabled"
	codeInvalidRequest = "invalid_request"
	codePromptTooLarge = "prompt_too_large"
	codeSchemaTooLarge = "schema_too_large"
	codeAITimeout      = "ai_timeout"
	codeAIUnavailable  = "ai_unavailable"
	codeInvalidAnswer  = "invalid_answer"
)

// maxBytesPerChar is the most a character takes in UTF-8; JSON escapes (\u00e9, \n) can take
// up to 6 bytes for one. The body cap below is only a memory guard, the real limit counts characters.
const maxBytesPerChar = 6

// features is the list of things the app may ask for. Unknown ones are refused.
var features = map[string]bool{"rank": true}

type Server struct {
	llm    llm.Completer
	limits Limits
	logger *slog.Logger
	ready  atomic.Bool
}

func New(c llm.Completer, limits Limits, logger *slog.Logger) *Server {
	s := &Server{llm: c, limits: limits, logger: logger}
	s.ready.Store(true)
	return s
}

func (s *Server) SetReady(v bool) { s.ready.Store(v) }

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, _ *http.Request) {
		if !s.ready.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	})
	mux.HandleFunc("POST /v1/complete", s.complete)
	return mux
}

type completeRequest struct {
	Feature string          `json:"feature"`
	UserID  string          `json:"user_id"`
	System  string          `json:"system"`
	Prompt  string          `json:"prompt"`
	Schema  json.RawMessage `json:"schema"`
	// Format is "json" (the default: the answer must be a JSON document) or "text" (any text, returned as a JSON string).
	Format string `json:"format"`
}

type completeResponse struct {
	Content json.RawMessage `json:"content"`
	Usage   llm.Usage       `json:"usage"`
	Model   string          `json:"model,omitempty"`
}

func (s *Server) complete(w http.ResponseWriter, r *http.Request) {
	if s.limits.Disabled {
		writeError(w, http.StatusServiceUnavailable, codeAIDisabled, "the AI is disabled")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, int64(s.limits.MaxPromptChars)*maxBytesPerChar+maxSchemaBytes+4096)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var in completeRequest
	if err := dec.Decode(&in); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, codePromptTooLarge, "request body too large")
			return
		}
		writeError(w, http.StatusBadRequest, codeInvalidRequest, "invalid request body")
		return
	}
	switch {
	case !features[in.Feature]:
		writeError(w, http.StatusBadRequest, codeInvalidRequest, "unknown feature")
		return
	case in.UserID == "" || in.Prompt == "":
		writeError(w, http.StatusBadRequest, codeInvalidRequest, "user_id and prompt are required")
		return
	case utf8.RuneCountInString(in.System)+utf8.RuneCountInString(in.Prompt) > s.limits.MaxPromptChars:
		writeError(w, http.StatusRequestEntityTooLarge, codePromptTooLarge, "prompt too large")
		return
	case len(in.Schema) > maxSchemaBytes:
		writeError(w, http.StatusRequestEntityTooLarge, codeSchemaTooLarge, "schema too large")
		return
	case len(in.Schema) > 0 && !isJSONObject(in.Schema):
		writeError(w, http.StatusBadRequest, codeInvalidRequest, "schema must be a JSON object")
		return
	case in.Format != "" && in.Format != "json" && in.Format != "text":
		writeError(w, http.StatusBadRequest, codeInvalidRequest, "format must be json or text")
		return
	case in.Format == "text" && len(in.Schema) > 0:
		writeError(w, http.StatusBadRequest, codeInvalidRequest, "a schema needs the json format")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), s.limits.Timeout)
	defer cancel()
	res, err := s.llm.Complete(ctx, llm.Request{
		System: in.System, Prompt: in.Prompt, MaxTokens: s.limits.MaxOutputTokens, Schema: in.Schema, Text: in.Format == "text",
	})
	if err != nil {
		s.logger.Error("completion failed", "feature", in.Feature, "error", err)
		if errors.Is(err, context.DeadlineExceeded) {
			writeError(w, http.StatusGatewayTimeout, codeAITimeout, "the AI took too long")
			return
		}
		writeError(w, http.StatusBadGateway, codeAIUnavailable, "the AI is unavailable")
		return
	}
	content := json.RawMessage(res.Content)
	if in.Format == "text" {
		// Free text: the caller reads it, so it travels as a JSON string.
		encoded, err := json.Marshal(res.Content)
		if err != nil {
			writeError(w, http.StatusBadGateway, codeInvalidAnswer, "the AI returned an invalid answer")
			return
		}
		content = encoded
	} else if !json.Valid([]byte(res.Content)) {
		// Strict JSON: refuse anything the model returned that is not valid JSON.
		s.logger.Error("model returned invalid JSON", "feature", in.Feature)
		writeError(w, http.StatusBadGateway, codeInvalidAnswer, "the AI returned an invalid answer")
		return
	}

	s.logger.Info("completion",
		"feature", in.Feature, "user", in.UserID,
		"model", res.Model, "prompt_tokens", res.Usage.PromptTokens, "completion_tokens", res.Usage.CompletionTokens)
	writeJSON(w, http.StatusOK, completeResponse{Content: content, Usage: res.Usage, Model: res.Model})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, map[string]string{"code": code, "error": msg})
}

// isJSONObject reports whether raw is a JSON object (not null, an array or a string).
func isJSONObject(raw json.RawMessage) bool {
	var m map[string]any
	return json.Unmarshal(raw, &m) == nil && m != nil
}
