package api

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/quentinrebergue/job-application-optimizer/services/pdf-text/internal/reader"
)

type fakeReader struct {
	res reader.Result
	err error
	got []byte
}

func (f *fakeReader) Text(_ context.Context, data []byte) (reader.Result, error) {
	f.got = data
	return f.res, f.err
}

func ready(f *fakeReader, max int64) (*Server, *bytes.Buffer) {
	var logs bytes.Buffer
	s := New(max, slog.New(slog.NewJSONHandler(&logs, nil)))
	s.SetReader(f)
	return s, &logs
}

func post(s *Server, body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/extract", strings.NewReader(body)))
	return rec
}

func TestExtract(t *testing.T) {
	f := &fakeReader{res: reader.Result{Text: "Camille", Pages: 7, PagesRead: 5, Truncated: true}}
	s, _ := ready(f, 1<<20)
	rec := post(s, "%PDF-1.7 bytes")
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"text":"Camille"`) || !strings.Contains(rec.Body.String(), `"truncated":true`) || !strings.Contains(rec.Body.String(), `"pages":7`) {
		t.Errorf("got %d %s", rec.Code, rec.Body)
	}
	if string(f.got) != "%PDF-1.7 bytes" {
		t.Errorf("the reader got %q", f.got)
	}
	if rec.Header().Get("Cache-Control") != "no-store" {
		t.Error("an answer that carries a resume must not be cached")
	}
}

func TestEachFailureHasItsOwnStatusAndCode(t *testing.T) {
	cases := []struct {
		err    error
		status int
		code   string
	}{
		{reader.ErrNotPDF, 415, "not_a_pdf"},
		{reader.ErrNoText, 422, "no_text"},
		{reader.ErrUnreadable, 422, "unreadable"},
		{reader.ErrBusy, 503, "busy"},
		{reader.ErrTimeout, 504, "timeout"},
		{context.Canceled, 499, "client_closed_request"},
		{errors.New("something else"), 500, "internal_error"},
	}
	for _, c := range cases {
		s, _ := ready(&fakeReader{err: c.err}, 1<<20)
		rec := post(s, "%PDF-")
		if rec.Code != c.status || !strings.Contains(rec.Body.String(), `"error":"`+c.code+`"`) {
			t.Errorf("%v: got %d %s, want %d %s", c.err, rec.Code, rec.Body, c.status, c.code)
		}
	}
	s, _ := ready(&fakeReader{err: reader.ErrBusy}, 1<<20)
	if post(s, "%PDF-").Header().Get("Retry-After") == "" {
		t.Error("a busy answer must say when to retry")
	}
}

func TestALargeFileIsRefusedBeforeBeingRead(t *testing.T) {
	f := &fakeReader{}
	s, _ := ready(f, 100)
	rec := post(s, "%PDF-"+strings.Repeat("a", 500))
	if rec.Code != 413 {
		t.Errorf("got %d, want 413", rec.Code)
	}
	if f.got != nil {
		t.Error("a file over the limit must never reach the reader")
	}
}

func TestNotReadyUntilTheReaderIsGiven(t *testing.T) {
	var logs bytes.Buffer
	s := New(1<<20, slog.New(slog.NewJSONHandler(&logs, nil)))
	get := func(path string) int {
		rec := httptest.NewRecorder()
		s.Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		return rec.Code
	}
	if get("/healthz") != 200 {
		t.Error("/healthz must answer while the module loads: the process is alive")
	}
	if get("/readyz") != 503 {
		t.Error("/readyz must fail while the module loads")
	}
	if rec := post(s, "%PDF-"); rec.Code != 503 || rec.Header().Get("Retry-After") == "" {
		t.Errorf("a file during the start: got %d, want 503 with a Retry-After", rec.Code)
	}
	s.SetReader(&fakeReader{})
	if get("/readyz") != 200 {
		t.Error("/readyz must pass once the reader is given")
	}
	s.SetReady(false)
	if get("/readyz") != 503 || get("/healthz") != 200 {
		t.Error("at the start of a shutdown /readyz fails and /healthz stays up")
	}
}

func TestNeitherTheFileNorTheTextIsLogged(t *testing.T) {
	const secret = "CAMILLE-MOREAU-PRIVATE-RESUME"
	// The errors of the reading layer are sentinels and wrapped causes of the machinery (pdfium, wazero): none holds the data.
	for _, f := range []*fakeReader{
		{res: reader.Result{Text: secret + " the text of the resume"}},
		{err: errors.New("pdfium crashed")},
		{err: reader.ErrUnreadable},
		{err: reader.ErrNoText},
	} {
		s, logs := ready(f, 1<<20)
		post(s, "%PDF-"+secret)
		if strings.Contains(logs.String(), secret) || strings.Contains(logs.String(), "CAMILLE") {
			t.Errorf("the file or the text reached the logs:\n%s", logs)
		}
	}
}
