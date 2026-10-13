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
	return llm.Result{Content: f.content, Usage: llm.Usage{PromptTokens: 3, CompletionTokens: 2}, Model: "test-model-1"}, nil
}

type recordingLLM struct{ got llm.Request }

func (r *recordingLLM) Complete(_ context.Context, req llm.Request) (llm.Result, error) {
	r.got = req
	return llm.Result{Content: `{}`}, nil
}

func post(t *testing.T, content, body string) *httptest.ResponseRecorder {
	t.Helper()
	srv := New(fakeLLM{content}, Limits{MaxPromptChars: 100, MaxOutputTokens: 50, Timeout: time.Second},
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

func TestCompleteSaysWhichModelAnswered(t *testing.T) {
	rec := post(t, `{}`, `{"feature":"rank","user_id":"u1","prompt":"hi"}`)
	if !strings.Contains(rec.Body.String(), `"model":"test-model-1"`) {
		t.Fatalf("got %s", rec.Body)
	}
}

func TestKillSwitchRefusesEveryCompletion(t *testing.T) {
	rec := &recordingLLM{}
	srv := New(rec, Limits{Disabled: true, MaxPromptChars: 100, MaxOutputTokens: 50, Timeout: time.Second},
		slog.New(slog.NewTextHandler(io.Discard, nil)))
	w := httptest.NewRecorder()
	body := `{"feature":"rank","user_id":"u1","prompt":"hi"}`
	srv.Handler().ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/v1/complete", strings.NewReader(body)))
	if w.Code != http.StatusServiceUnavailable || !strings.Contains(w.Body.String(), `"code":"ai_disabled"`) {
		t.Fatalf("got %d %s", w.Code, w.Body)
	}
	if rec.got.Prompt != "" {
		t.Fatal("the AI was called although it is disabled")
	}
	// The probes still answer: switching the AI off must not get the pod restarted.
	for _, path := range []string{"/healthz", "/readyz"} {
		p := httptest.NewRecorder()
		srv.Handler().ServeHTTP(p, httptest.NewRequest(http.MethodGet, path, nil))
		if p.Code != http.StatusOK {
			t.Fatalf("%s answered %d", path, p.Code)
		}
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
		"unknown feature":      {`{"feature":"x","user_id":"u1","prompt":"hi"}`, http.StatusBadRequest},
		"no user":              {`{"feature":"rank","prompt":"hi"}`, http.StatusBadRequest},
		"too large":            {`{"feature":"rank","user_id":"u1","prompt":"` + strings.Repeat("a", 200) + `"}`, http.StatusRequestEntityTooLarge},
		"schema not an object": {`{"feature":"rank","user_id":"u1","prompt":"hi","schema":"nope"}`, http.StatusBadRequest},
		"schema null":          {`{"feature":"rank","user_id":"u1","prompt":"hi","schema":null}`, http.StatusBadRequest},
		"unknown field":        {`{"feature":"rank","user_id":"u1","prompt":"hi","x":1}`, http.StatusBadRequest},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			if got := post(t, `{}`, c.body).Code; got != c.want {
				t.Fatalf("got %d, want %d", got, c.want)
			}
		})
	}
}

func TestCompleteCountsCharactersNotBytes(t *testing.T) {
	// 100 "é" are 200 bytes but 100 characters: at the limit, accepted. 101 are refused.
	ok := post(t, `{}`, `{"feature":"rank","user_id":"u1","prompt":"`+strings.Repeat("é", 100)+`"}`)
	if ok.Code != http.StatusOK {
		t.Fatalf("100 characters: got %d %s", ok.Code, ok.Body)
	}
	tooLong := post(t, `{}`, `{"feature":"rank","user_id":"u1","prompt":"`+strings.Repeat("é", 101)+`"}`)
	if tooLong.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("101 characters: got %d", tooLong.Code)
	}
}

func TestCompleteTellsTheAppWhyItRefused(t *testing.T) {
	cases := map[string]struct {
		body     string
		wantCode string
	}{
		"prompt too large": {`{"feature":"rank","user_id":"u1","prompt":"` + strings.Repeat("a", 200) + `"}`, "prompt_too_large"},
		"body too large":   {`{"feature":"rank","user_id":"u1","prompt":"` + strings.Repeat("a", 100000) + `"}`, "prompt_too_large"},
		"unknown feature":  {`{"feature":"x","user_id":"u1","prompt":"hi"}`, "invalid_request"},
		"broken body":      {`{`, "invalid_request"},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			rec := post(t, `{}`, c.body)
			if !strings.Contains(rec.Body.String(), `"code":"`+c.wantCode+`"`) {
				t.Fatalf("got %d %s, want code %s", rec.Code, rec.Body, c.wantCode)
			}
		})
	}
}

func TestCompletePassesTheSchemaOn(t *testing.T) {
	rec := &recordingLLM{}
	srv := New(rec, Limits{MaxPromptChars: 100, MaxOutputTokens: 50, Timeout: time.Second},
		slog.New(slog.NewTextHandler(io.Discard, nil)))
	w := httptest.NewRecorder()
	body := `{"feature":"rank","user_id":"u1","prompt":"hi","schema":{"type":"object"}}`
	srv.Handler().ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/v1/complete", strings.NewReader(body)))
	if w.Code != http.StatusOK || string(rec.got.Schema) != `{"type":"object"}` {
		t.Fatalf("got %d, schema %q", w.Code, rec.got.Schema)
	}
}

func TestCompleteReturnsFreeTextAsAJSONString(t *testing.T) {
	// The model's text is not JSON: with format "text" it is returned as a string, not refused.
	rec := post(t, "levels:\n  E1: 3", `{"feature":"rank","user_id":"u1","prompt":"hi","format":"text"}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"content":"levels:\n  E1: 3"`) {
		t.Fatalf("got %d %s", rec.Code, rec.Body)
	}
}

func TestCompleteStillRefusesTextThatIsNotJSONByDefault(t *testing.T) {
	rec := post(t, "levels: 1", `{"feature":"rank","user_id":"u1","prompt":"hi"}`)
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("got %d", rec.Code)
	}
}

func TestImportHasItsOwnOutputCap(t *testing.T) {
	for feature, want := range map[string]int{"rank": 50, "import": 400} {
		rec := &recordingLLM{}
		srv := New(rec, Limits{MaxPromptChars: 100, MaxOutputTokens: 50, ImportMaxOutputTokens: 400, Timeout: time.Second},
			slog.New(slog.NewTextHandler(io.Discard, nil)))
		w := httptest.NewRecorder()
		body := `{"feature":"` + feature + `","user_id":"u1","prompt":"hi"}`
		srv.Handler().ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/v1/complete", strings.NewReader(body)))
		if w.Code != http.StatusOK || rec.got.MaxTokens != want {
			t.Fatalf("%s: got %d, max tokens %d, want %d", feature, w.Code, rec.got.MaxTokens, want)
		}
	}
}

func TestImportFallsBackToTheCommonCapWhenNoneIsSet(t *testing.T) {
	rec := &recordingLLM{}
	srv := New(rec, Limits{MaxPromptChars: 100, MaxOutputTokens: 50, Timeout: time.Second},
		slog.New(slog.NewTextHandler(io.Discard, nil)))
	w := httptest.NewRecorder()
	body := `{"feature":"import","user_id":"u1","prompt":"hi"}`
	srv.Handler().ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/v1/complete", strings.NewReader(body)))
	if w.Code != http.StatusOK || rec.got.MaxTokens != 50 {
		t.Fatalf("got %d, max tokens %d", w.Code, rec.got.MaxTokens)
	}
}
