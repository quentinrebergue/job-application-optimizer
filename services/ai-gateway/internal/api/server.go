package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/quentinrebergue/job-application-optimizer/services/ai-gateway/internal/llm"
)

type Limits struct {
	MaxPromptBytes  int
	MaxOutputTokens int
	Timeout         time.Duration
}

// maxSchemaBytes caps the JSON Schema an app may send along with a prompt.
const maxSchemaBytes = 32 << 10

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
}

func (s *Server) complete(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, int64(s.limits.MaxPromptBytes)+maxSchemaBytes+4096)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var in completeRequest
	if err := dec.Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	switch {
	case !features[in.Feature]:
		writeError(w, http.StatusBadRequest, "unknown feature")
		return
	case in.UserID == "" || in.Prompt == "":
		writeError(w, http.StatusBadRequest, "user_id and prompt are required")
		return
	case len(in.System)+len(in.Prompt) > s.limits.MaxPromptBytes:
		writeError(w, http.StatusRequestEntityTooLarge, "prompt too large")
		return
	case len(in.Schema) > maxSchemaBytes:
		writeError(w, http.StatusRequestEntityTooLarge, "schema too large")
		return
	case len(in.Schema) > 0 && !isJSONObject(in.Schema):
		writeError(w, http.StatusBadRequest, "schema must be a JSON object")
		return
	case in.Format != "" && in.Format != "json" && in.Format != "text":
		writeError(w, http.StatusBadRequest, "format must be json or text")
		return
	case in.Format == "text" && len(in.Schema) > 0:
		writeError(w, http.StatusBadRequest, "a schema needs the json format")
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
			writeError(w, http.StatusGatewayTimeout, "the AI took too long")
			return
		}
		writeError(w, http.StatusBadGateway, "the AI is unavailable")
		return
	}
	content := json.RawMessage(res.Content)
	if in.Format == "text" {
		// Free text: the caller reads it, so it travels as a JSON string.
		encoded, err := json.Marshal(res.Content)
		if err != nil {
			writeError(w, http.StatusBadGateway, "the AI returned an invalid answer")
			return
		}
		content = encoded
	} else if !json.Valid([]byte(res.Content)) {
		// Strict JSON: refuse anything the model returned that is not valid JSON.
		s.logger.Error("model returned invalid JSON", "feature", in.Feature)
		writeError(w, http.StatusBadGateway, "the AI returned an invalid answer")
		return
	}

	s.logger.Info("completion",
		"feature", in.Feature, "user", in.UserID,
		"prompt_tokens", res.Usage.PromptTokens, "completion_tokens", res.Usage.CompletionTokens)
	writeJSON(w, http.StatusOK, completeResponse{Content: content, Usage: res.Usage})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// isJSONObject reports whether raw is a JSON object (not null, an array or a string).
func isJSONObject(raw json.RawMessage) bool {
	var m map[string]any
	return json.Unmarshal(raw, &m) == nil && m != nil
}
