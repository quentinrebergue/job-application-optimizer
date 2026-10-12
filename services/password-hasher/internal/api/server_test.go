package api

import (
	"bytes"
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/quentinrebergue/job-application-optimizer/services/password-hasher/internal/hasher"
)

type fakeHasher struct {
	hash  string
	valid bool
	err   error
}

func (f fakeHasher) Hash(context.Context, []byte) (string, error)         { return f.hash, f.err }
func (f fakeHasher) Verify(context.Context, []byte, string) (bool, error) { return f.valid, f.err }

func post(t *testing.T, s *Server, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, req)
	return rec
}

func newServer(f fakeHasher) (*Server, *bytes.Buffer) {
	var logs bytes.Buffer
	return New(f, slog.New(slog.NewJSONHandler(&logs, nil))), &logs
}

func TestHash(t *testing.T) {
	s, _ := newServer(fakeHasher{hash: "$2b$12$abc"})
	rec := post(t, s, "/hash", `{"password":"secret"}`)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"hash":"$2b$12$abc"`) {
		t.Errorf("got %d %s", rec.Code, rec.Body)
	}
	if rec.Header().Get("Cache-Control") != "no-store" {
		t.Error("an answer that carries a hash must not be cached")
	}
}

func TestVerify(t *testing.T) {
	for _, valid := range []bool{true, false} {
		s, _ := newServer(fakeHasher{valid: valid})
		rec := post(t, s, "/verify", `{"password":"x","hash":"$2b$12$abc"}`)
		want := `{"valid":false}`
		if valid {
			want = `{"valid":true}`
		}
		if rec.Code != 200 || strings.TrimSpace(rec.Body.String()) != want {
			t.Errorf("valid=%v: got %d %s", valid, rec.Code, rec.Body)
		}
	}
}

func TestRejectsABadRequest(t *testing.T) {
	s, _ := newServer(fakeHasher{})
	cases := map[string]struct{ path, body string }{
		"no password to hash":  {"/hash", `{"password":""}`},
		"no hash to verify":    {"/verify", `{"password":"x"}`},
		"not JSON":             {"/hash", `password=x`},
		"an unknown field":     {"/hash", `{"password":"x","cost":4}`},
		"a body that is empty": {"/verify", ``},
	}
	for name, c := range cases {
		if rec := post(t, s, c.path, c.body); rec.Code != 400 {
			t.Errorf("%s: got %d, want 400", name, rec.Code)
		}
	}
}

func TestRefusesALargeBody(t *testing.T) {
	s, _ := newServer(fakeHasher{})
	rec := post(t, s, "/hash", `{"password":"`+strings.Repeat("a", maxBodyBytes)+`"}`)
	if rec.Code != 413 {
		t.Errorf("got %d, want 413", rec.Code)
	}
}

func TestBusyIsAnAnswerToRetryNotAWrongPassword(t *testing.T) {
	s, _ := newServer(fakeHasher{err: hasher.ErrBusy})
	rec := post(t, s, "/verify", `{"password":"x","hash":"h"}`)
	if rec.Code != 503 || rec.Header().Get("Retry-After") != "1" {
		t.Errorf("got %d, Retry-After %q; want 503 and 1", rec.Code, rec.Header().Get("Retry-After"))
	}
	if strings.Contains(rec.Body.String(), "valid") {
		t.Error("a busy answer must not carry a verdict")
	}
}

func TestInvalidHashIsNot200(t *testing.T) {
	s, _ := newServer(fakeHasher{err: hasher.ErrInvalidHash})
	if rec := post(t, s, "/verify", `{"password":"x","hash":"junk"}`); rec.Code != 422 {
		t.Errorf("got %d, want 422", rec.Code)
	}
}

func TestNoPasswordNorHashInTheLogs(t *testing.T) {
	const password, hash = "correct-horse-battery-STAPLE", "$2b$12$SECRETHASHSECRETHASHSECRETHAS"
	for _, f := range []fakeHasher{{hash: hash}, {valid: true}, {err: hasher.ErrBusy}, {err: context.Canceled}, {err: bytes.ErrTooLarge}} {
		s, logs := newServer(f)
		post(t, s, "/hash", `{"password":"`+password+`"}`)
		post(t, s, "/verify", `{"password":"`+password+`","hash":"`+hash+`"}`)
		post(t, s, "/verify", `{"password":"`+password+`"`) // broken JSON that holds the password
		if strings.Contains(logs.String(), password) || strings.Contains(logs.String(), "SECRETHASH") {
			t.Errorf("a password or a hash reached the logs:\n%s", logs)
		}
	}
}

func TestReadiness(t *testing.T) {
	s, _ := newServer(fakeHasher{})
	get := func(path string) int {
		rec := httptest.NewRecorder()
		s.Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		return rec.Code
	}
	if get("/readyz") != 200 || get("/healthz") != 200 {
		t.Fatal("a new server must be healthy and ready")
	}
	s.SetReady(false)
	if get("/readyz") != 503 {
		t.Error("/readyz must fail once the shutdown starts")
	}
	if get("/healthz") != 200 {
		t.Error("/healthz must stay up while the server drains")
	}
}
