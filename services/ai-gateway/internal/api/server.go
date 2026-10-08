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
	Feature string `json:"feature"`
	UserID  string `json:"user_id"`
	System  string `json:"system"`
	Prompt  string `json:"prompt"`
}

type completeResponse struct {
	Content json.RawMessage `json:"content"`
	Usage   llm.Usage       `json:"usage"`
}

func (s *Server) complete(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, int64(s.limits.MaxPromptBytes)+4096)
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
	}

	ctx, cancel := context.WithTimeout(r.Context(), s.limits.Timeout)
	defer cancel()
	res, err := s.llm.Complete(ctx, llm.Request{
		System: in.System, Prompt: in.Prompt, MaxTokens: s.limits.MaxOutputTokens,
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
	// Strict JSON: refuse anything the model returned that is not valid JSON.
	if !json.Valid([]byte(res.Content)) {
		s.logger.Error("model returned invalid JSON", "feature", in.Feature)
		writeError(w, http.StatusBadGateway, "the AI returned an invalid answer")
		return
	}

	s.logger.Info("completion",
		"feature", in.Feature, "user", in.UserID,
		"prompt_tokens", res.Usage.PromptTokens, "completion_tokens", res.Usage.CompletionTokens)
	writeJSON(w, http.StatusOK, completeResponse{Content: json.RawMessage(res.Content), Usage: res.Usage})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
