package render

import (
	"bytes"
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/templates"
)

func requireTypst(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("typst"); err != nil {
		t.Skip("typst is not installed")
	}
}

func renderClassic(t *testing.T, body string) []byte {
	t.Helper()
	store, err := templates.NewBuiltin()
	if err != nil {
		t.Fatalf("NewBuiltin: %v", err)
	}
	tpl, ok := store.Get("classic")
	if !ok {
		t.Fatal("classic template missing")
	}
	req := decode(t, body)
	options, err := templates.ResolveOptions(&tpl.Manifest, req.Options)
	if err != nil {
		t.Fatalf("ResolveOptions: %v", err)
	}
	data, err := BuildData(req, options)
	if err != nil {
		t.Fatalf("BuildData: %v", err)
	}
	pdf, err := New(Config{}).Render(context.Background(), tpl.Source, data)
	if err != nil {
		t.Fatalf("Render: %v", err)
	}
	return pdf
}

func TestRenderClassicEndToEnd(t *testing.T) {
	requireTypst(t)
	pdf := renderClassic(t, `{
	  "schema_version": 1,
	  "template": {"id": "classic"},
	  "options": {"fontSize": 11, "accentColor": "#cc3300"},
	  "profile": {"name": "Zoë Café", "email": "z@example.com", "summary": "100% #hashtag $5 [x] *y* _z_"},
	  "sections": {
	    "experiences": [{"title": "SRE", "company": "Acme", "location": "Paris", "period": "2024", "description": "a\nb"}],
	    "projects": [{"title": "App", "tech": ["Go"], "description": "d"}],
	    "skills": [{"name": "Languages", "tags": ["Go", "TS"]}],
	    "education": [{"degree": "MSc", "institution": "EPITA", "period": "2026"}]
	  }
	}`)
	if !bytes.HasPrefix(pdf, []byte("%PDF-")) || len(pdf) < 1000 {
		t.Errorf("not a plausible PDF: %d bytes, starts with %q", len(pdf), pdf[:min(8, len(pdf))])
	}
}

func TestRenderClassicWithOnlyAName(t *testing.T) {
	requireTypst(t)
	pdf := renderClassic(t, `{"schema_version": 1, "template": {"id": "classic"}, "profile": {"name": "Ada"}}`)
	if !bytes.HasPrefix(pdf, []byte("%PDF-")) {
		t.Errorf("not a PDF, starts with %q", pdf[:min(8, len(pdf))])
	}
}

func TestRenderCompileError(t *testing.T) {
	requireTypst(t)
	_, err := New(Config{}).Render(context.Background(), []byte("#let x = ("), []byte("{}"))

	var ce *CompileError
	if !errors.As(err, &ce) {
		t.Fatalf("expected a *CompileError, got %v", err)
	}
	if strings.TrimSpace(ce.Output) == "" {
		t.Error("the compile error should carry Typst's diagnostics")
	}
	if strings.Contains(ce.Output, os.TempDir()) || strings.Contains(ce.Output, "/render-") {
		t.Errorf("diagnostics leak the work directory: %s", ce.Output)
	}
}

func fakeTypst(t *testing.T, script string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "fake-typst")
	if err := os.WriteFile(path, []byte("#!/bin/sh\n"+script+"\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestRenderTimeout(t *testing.T) {
	tr := New(Config{Binary: fakeTypst(t, "exec sleep 5"), Timeout: 200 * time.Millisecond})

	start := time.Now()
	_, err := tr.Render(context.Background(), []byte("x"), []byte("{}"))

	if !errors.Is(err, ErrTimeout) {
		t.Fatalf("expected ErrTimeout, got %v", err)
	}
	if elapsed := time.Since(start); elapsed > 3*time.Second {
		t.Errorf("the process was not stopped promptly: %v", elapsed)
	}
}

func TestRenderCancelledByCaller(t *testing.T) {
	tr := New(Config{Binary: fakeTypst(t, "exec sleep 5")})
	ctx, cancel := context.WithCancel(context.Background())
	time.AfterFunc(100*time.Millisecond, cancel)

	_, err := tr.Render(ctx, []byte("x"), []byte("{}"))
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
}

func TestRenderBusy(t *testing.T) {
	tr := New(Config{MaxConcurrent: 1})
	tr.sem <- struct{}{} // simulate a render already running

	_, err := tr.Render(context.Background(), []byte("x"), []byte("{}"))
	if !errors.Is(err, ErrBusy) {
		t.Fatalf("expected ErrBusy, got %v", err)
	}

	<-tr.sem // a slot is free again: the next call must get past the semaphore
	_, err = tr.Render(context.Background(), []byte("x"), []byte("{}"))
	if errors.Is(err, ErrBusy) {
		t.Fatal("a free slot should not report ErrBusy")
	}
}

func TestLimitedBufferKeepsOutputBounded(t *testing.T) {
	var b limitedBuffer
	big := bytes.Repeat([]byte("x"), maxDiagnostics*3)
	n, err := b.Write(big)
	if err != nil || n != len(big) {
		t.Fatalf("Write = (%d, %v), want a full successful write", n, err)
	}
	if got := len(b.String()); got != maxDiagnostics {
		t.Errorf("kept %d bytes, want %d", got, maxDiagnostics)
	}
}
