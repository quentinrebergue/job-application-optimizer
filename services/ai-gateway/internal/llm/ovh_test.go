package llm

import (
	"context"
	"encoding/json"
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

func requestFormat(t *testing.T, schema json.RawMessage) map[string]any {
	t.Helper()
	var sent map[string]any
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&sent)
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"{}"}}],"usage":{}}`))
	}))
	defer ts.Close()
	if _, err := newTestClient(ts.URL).Complete(context.Background(), Request{Prompt: "hi", Schema: schema}); err != nil {
		t.Fatal(err)
	}
	return sent["response_format"].(map[string]any)
}

func TestCompleteAsksForAJSONObjectWithoutASchema(t *testing.T) {
	if f := requestFormat(t, nil); f["type"] != "json_object" {
		t.Fatalf("got %v", f)
	}
}

func TestCompleteAsksForTheSchemaWhenGiven(t *testing.T) {
	f := requestFormat(t, json.RawMessage(`{"type":"object"}`))
	js, ok := f["json_schema"].(map[string]any)
	if f["type"] != "json_schema" || !ok || js["strict"] != true {
		t.Fatalf("got %v", f)
	}
	if schema, _ := js["schema"].(map[string]any); schema["type"] != "object" {
		t.Fatalf("schema not passed on: %v", js)
	}
}

func TestCompleteOmitsTheResponseFormatForFreeText(t *testing.T) {
	var sent map[string]any
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&sent)
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"a: 1"}}],"usage":{}}`))
	}))
	defer ts.Close()
	res, err := newTestClient(ts.URL).Complete(context.Background(), Request{Prompt: "hi", Text: true})
	if err != nil {
		t.Fatal(err)
	}
	if _, found := sent["response_format"]; found || res.Content != "a: 1" {
		t.Fatalf("response_format sent: %v, content %q", found, res.Content)
	}
}
