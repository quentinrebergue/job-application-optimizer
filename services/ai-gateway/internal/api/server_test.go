package api

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/quentinrebergue/job-application-optimizer/services/ai-gateway/internal/llm"
)

type fakeLLM struct{ content string }

func (f fakeLLM) Complete(context.Context, llm.Request) (llm.Result, error) {
	return llm.Result{Content: f.content, Usage: llm.Usage{PromptTokens: 3, CompletionTokens: 2}}, nil
}

func post(t *testing.T, content, body string) *httptest.ResponseRecorder {
	t.Helper()
	srv := New(fakeLLM{content}, Limits{MaxPromptBytes: 100, MaxOutputTokens: 50, Timeout: time.Second},
		slog.New(slog.NewTextHandler(io.Discard, nil)))
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/v1/complete", strings.NewReader(body)))
	return rec
}

func TestCompleteReturnsContentAndUsage(t *testing.T) {
	rec := post(t, `{"score":7}`, `{"feature":"rank","user_id":"u1","prompt":"hi"}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"score":7`) ||
		!strings.Contains(rec.Body.String(), `"prompt_tokens":3`) {
		t.Fatalf("got %d %s", rec.Code, rec.Body)
	}
}

func TestCompleteRefusesInvalidJSONFromTheModel(t *testing.T) {
	rec := post(t, `not json`, `{"feature":"rank","user_id":"u1","prompt":"hi"}`)
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("got %d", rec.Code)
	}
}

func TestCompleteValidatesTheRequest(t *testing.T) {
	cases := map[string]struct {
		body string
		want int
	}{
		"unknown feature": {`{"feature":"x","user_id":"u1","prompt":"hi"}`, http.StatusBadRequest},
		"no user":         {`{"feature":"rank","prompt":"hi"}`, http.StatusBadRequest},
		"too large":       {`{"feature":"rank","user_id":"u1","prompt":"` + strings.Repeat("a", 200) + `"}`, http.StatusRequestEntityTooLarge},
		"unknown field":   {`{"feature":"rank","user_id":"u1","prompt":"hi","x":1}`, http.StatusBadRequest},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			if got := post(t, `{}`, c.body).Code; got != c.want {
				t.Fatalf("got %d, want %d", got, c.want)
			}
		})
	}
}
