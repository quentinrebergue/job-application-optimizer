package llm

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func newTestClient(url string) *OVH {
	return NewOVH(OVHOptions{
		BaseURL: url, Token: "t", Model: "m",
		AttemptTimeout: time.Second, MaxRetries: 2, Backoff: time.Millisecond,
	})
}

func TestCompleteRetriesOn503ThenSucceeds(t *testing.T) {
	var calls atomic.Int32
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) == 1 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		if r.Header.Get("Authorization") != "Bearer t" {
			t.Errorf("missing bearer token")
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"{\"ok\":true}"}}],"usage":{"prompt_tokens":10,"completion_tokens":5}}`))
	}))
	defer ts.Close()

	res, err := newTestClient(ts.URL).Complete(context.Background(), Request{Prompt: "hi", MaxTokens: 10})
	if err != nil {
		t.Fatal(err)
	}
	if res.Content != `{"ok":true}` || res.Usage.PromptTokens != 10 || calls.Load() != 2 {
		t.Fatalf("unexpected result %+v after %d calls", res, calls.Load())
	}
}

func TestCompleteDoesNotRetryOn400(t *testing.T) {
	var calls atomic.Int32
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls.Add(1)
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer ts.Close()

	if _, err := newTestClient(ts.URL).Complete(context.Background(), Request{Prompt: "hi"}); err == nil {
		t.Fatal("expected an error")
	}
	if calls.Load() != 1 {
		t.Fatalf("expected 1 call, got %d", calls.Load())
	}
}
