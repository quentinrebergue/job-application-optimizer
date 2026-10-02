package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os/exec"
	"strings"
	"testing"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/render"
	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/templates"
)

const validBody = `{
  "schema_version": 1,
  "template": {"id": "classic"},
  "profile": {"name": "Ada Lovelace"},
  "sections": {"experiences": [{"title": "SRE", "company": "Acme"}]}
}`

var fakePDF = []byte("%PDF-1.7 fake")

// fakeRenderer records what it was given and returns a canned result.
type fakeRenderer struct {
	pdf     []byte
	err     error
	source  []byte
	data    []byte
	callCnt int
}

func (f *fakeRenderer) Render(ctx context.Context, source, data []byte) ([]byte, error) {
	f.callCnt++
	f.source, f.data = source, data
	return f.pdf, f.err
}

func newTestServer(t *testing.T, r Renderer) *Server {
	t.Helper()
	store, err := templates.NewBuiltin()
	if err != nil {
		t.Fatalf("NewBuiltin: %v", err)
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return New(store, r, prometheus.NewRegistry(), logger)
}

func do(t *testing.T, s *Server, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, req)
	return rec
}

func TestRenderOK(t *testing.T) {
	fake := &fakeRenderer{pdf: fakePDF}
	rec := do(t, newTestServer(t, fake), "POST", "/render", validBody)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/pdf" {
		t.Errorf("Content-Type = %q, want application/pdf", got)
	}
	if !bytes.Equal(rec.Body.Bytes(), fakePDF) {
		t.Errorf("body = %q, want the renderer's PDF", rec.Body)
	}

	// The renderer received the template source and a data.json that carries
	// the manifest defaults for the options the client did not send.
	if len(fake.source) == 0 {
		t.Error("the renderer was not given the template source")
	}
	var data struct {
		Options map[string]any `json:"options"`
		Profile struct {
			Name string `json:"name"`
		} `json:"profile"`
	}
	if err := json.Unmarshal(fake.data, &data); err != nil {
		t.Fatalf("data.json handed to the renderer is invalid: %v", err)
	}
	if data.Options["fontSize"] != 10.5 || data.Profile.Name != "Ada Lovelace" {
		t.Errorf("unexpected data.json: %s", fake.data)
	}
}

func TestRenderRequestErrors(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantCode   string
	}{
		{"not json", `hello`, http.StatusBadRequest, "invalid_request"},
		{"invalid content", strings.Replace(validBody, `"Ada Lovelace"`, `""`, 1), http.StatusBadRequest, "invalid_request"},
		{"unknown template", strings.Replace(validBody, `"classic"`, `"nope"`, 1), http.StatusNotFound, "unknown_template"},
		{"bad option", strings.Replace(validBody, `"template": {"id": "classic"}`, `"template": {"id": "classic"}, "options": {"fontSize": 99}`, 1), http.StatusBadRequest, "invalid_options"},
		{"body too large", `{"padding": "` + strings.Repeat("x", maxBodyBytes) + `"}`, http.StatusRequestEntityTooLarge, "payload_too_large"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			fake := &fakeRenderer{pdf: fakePDF}
			rec := do(t, newTestServer(t, fake), "POST", "/render", tc.body)

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d: %s", rec.Code, tc.wantStatus, rec.Body)
			}
			var got struct {
				Error string `json:"error"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || got.Error != tc.wantCode {
				t.Errorf("error code = %q (%v), want %q; body %s", got.Error, err, tc.wantCode, rec.Body)
			}
			if fake.callCnt != 0 {
				t.Error("a rejected request must never reach the renderer")
			}
		})
	}
}

func TestRenderPlainValidationListsEveryProblem(t *testing.T) {
	body := `{"schema_version": 9, "template": {"id": "classic"}, "profile": {"name": ""}}`
	rec := do(t, newTestServer(t, &fakeRenderer{}), "POST", "/render", body)

	var got struct {
		Problems []string `json:"problems"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("bad JSON error body: %v", err)
	}
	if len(got.Problems) != 2 {
		t.Errorf("problems = %v, want 2 (schema_version and profile.name)", got.Problems)
	}
}

func TestRenderErrorMapping(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
	}{
		{"busy", render.ErrBusy, http.StatusTooManyRequests, "busy"},
		{"timeout", render.ErrTimeout, http.StatusGatewayTimeout, "render_timeout"},
		{"compile error", &render.CompileError{Output: "error: boom"}, http.StatusUnprocessableEntity, "template_error"},
		{"client went away", context.Canceled, statusClientClosedRequest, "client_closed_request"},
		{"anything else", errors.New("disk on fire"), http.StatusInternalServerError, "internal_error"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := do(t, newTestServer(t, &fakeRenderer{err: tc.err}), "POST", "/render", validBody)

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d: %s", rec.Code, tc.wantStatus, rec.Body)
			}
			if !strings.Contains(rec.Body.String(), `"`+tc.wantCode+`"`) {
				t.Errorf("body %s should contain code %q", rec.Body, tc.wantCode)
			}
			if tc.wantStatus == http.StatusTooManyRequests && rec.Header().Get("Retry-After") == "" {
				t.Error("a 429 should tell the client when to retry")
			}
			if tc.err != nil && strings.Contains(rec.Body.String(), "disk on fire") {
				t.Error("internal error details must not be sent to the client")
			}
		})
	}
}

func TestWrongMethod(t *testing.T) {
	rec := do(t, newTestServer(t, &fakeRenderer{}), "GET", "/render", "")
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("GET /render = %d, want 405", rec.Code)
	}
}

func TestTemplatesEndpoint(t *testing.T) {
	rec := do(t, newTestServer(t, &fakeRenderer{}), "GET", "/templates", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	var got struct {
		Templates []struct {
			ID      string                    `json:"id"`
			Options map[string]map[string]any `json:"options"`
		} `json:"templates"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("bad JSON: %v", err)
	}
	if len(got.Templates) == 0 || got.Templates[0].ID != "classic" {
		t.Fatalf("templates = %+v, want classic", got.Templates)
	}
	if got.Templates[0].Options["fontSize"]["type"] != "number" {
		t.Errorf("the option schema should be exposed to clients: %+v", got.Templates[0].Options)
	}
}

func TestProbes(t *testing.T) {
	s := newTestServer(t, &fakeRenderer{})

	if rec := do(t, s, "GET", "/healthz", ""); rec.Code != http.StatusOK {
		t.Errorf("/healthz = %d, want 200", rec.Code)
	}
	if rec := do(t, s, "GET", "/readyz", ""); rec.Code != http.StatusOK {
		t.Errorf("/readyz = %d, want 200", rec.Code)
	}

	s.SetReady(false)
	if rec := do(t, s, "GET", "/readyz", ""); rec.Code != http.StatusServiceUnavailable {
		t.Errorf("/readyz while shutting down = %d, want 503", rec.Code)
	}
	if rec := do(t, s, "GET", "/healthz", ""); rec.Code != http.StatusOK {
		t.Errorf("/healthz must stay 200 while shutting down, got %d", rec.Code)
	}
}

func TestMetrics(t *testing.T) {
	fake := &fakeRenderer{pdf: fakePDF}
	s := newTestServer(t, fake)

	do(t, s, "POST", "/render", validBody)
	fake.pdf, fake.err = nil, render.ErrBusy
	do(t, s, "POST", "/render", validBody)
	do(t, s, "POST", "/render", `{"template": {"id": "<script>"}}`)

	out := do(t, s, "GET", "/metrics", "").Body.String()
	for _, want := range []string{
		`resume_renderer_renders_total{status="ok",template="classic"} 1`,
		`resume_renderer_renders_total{status="busy",template="classic"} 1`,
		`resume_renderer_renders_total{status="invalid",template="unknown"} 1`,
		`resume_renderer_render_duration_seconds_count{template="classic"} 1`,
		`resume_renderer_renders_in_flight 0`,
	} {
		if !strings.Contains(out, want) {
			t.Errorf("metrics output is missing %q", want)
		}
	}
	if strings.Contains(out, "<script>") {
		t.Error("client-supplied text must never become a metric label")
	}
}

func TestRenderWithRealTypst(t *testing.T) {
	if _, err := exec.LookPath("typst"); err != nil {
		t.Skip("typst is not installed")
	}
	s := newTestServer(t, render.New(render.Config{}))

	rec := do(t, s, "POST", "/render", validBody)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", rec.Code, rec.Body)
	}
	if !bytes.HasPrefix(rec.Body.Bytes(), []byte("%PDF-")) {
		t.Errorf("response is not a PDF: %q", rec.Body.Bytes()[:8])
	}
}
