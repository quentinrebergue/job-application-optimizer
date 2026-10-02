package render

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

var (
	ErrBusy    = errors.New("renderer is busy")
	ErrTimeout = errors.New("render timed out")
)

// CompileError means Typst ran but rejected the document.
type CompileError struct {
	Output string
}

func (e *CompileError) Error() string {
	return "typst compile failed: " + e.Output
}

type Config struct {
	Binary        string        // typst executable, "typst" by default
	FontPath      string        // when set, only the fonts in this directory are used
	Timeout       time.Duration // per render, 15s by default
	MaxConcurrent int           // renders running at once, 4 by default
}

type Typst struct {
	cfg Config
	sem chan struct{}
}

func New(cfg Config) *Typst {
	if cfg.Binary == "" {
		cfg.Binary = "typst"
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = 15 * time.Second
	}
	if cfg.MaxConcurrent <= 0 {
		cfg.MaxConcurrent = 4
	}
	return &Typst{cfg: cfg, sem: make(chan struct{}, cfg.MaxConcurrent)}
}

// Render compiles a template source against its data.json and returns the PDF.
// Each call works in its own temporary directory, which is also Typst's
// --root: the template cannot read anything outside it.
func (t *Typst) Render(ctx context.Context, source, data []byte) ([]byte, error) {
	select {
	case t.sem <- struct{}{}:
		defer func() { <-t.sem }()
	default:
		return nil, ErrBusy
	}

	dir, err := os.MkdirTemp("", "render-")
	if err != nil {
		return nil, fmt.Errorf("create work dir: %w", err)
	}
	defer os.RemoveAll(dir)
	// Resolve symlinks (/var -> /private/var on macOS) so the directory name we
	// scrub from error messages is the one Typst actually prints.
	if resolved, err := filepath.EvalSymlinks(dir); err == nil {
		dir = resolved
	}

	if err := os.WriteFile(filepath.Join(dir, "main.typ"), source, 0o600); err != nil {
		return nil, fmt.Errorf("write template: %w", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "data.json"), data, 0o600); err != nil {
		return nil, fmt.Errorf("write data: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, t.cfg.Timeout)
	defer cancel()

	args := []string{"compile", "--root", dir}
	if t.cfg.FontPath != "" {
		args = append(args, "--font-path", t.cfg.FontPath, "--ignore-system-fonts")
	}
	args = append(args, "main.typ", "out.pdf")

	cmd := exec.CommandContext(ctx, t.cfg.Binary, args...)
	cmd.Dir = dir
	cmd.Env = []string{"HOME=" + dir}
	cmd.WaitDelay = 2 * time.Second
	var diagnostics limitedBuffer
	cmd.Stderr = &diagnostics

	if err := cmd.Run(); err != nil {
		if ctxErr := ctx.Err(); ctxErr != nil {
			if errors.Is(ctxErr, context.DeadlineExceeded) {
				return nil, ErrTimeout
			}
			return nil, ctxErr
		}
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			return nil, &CompileError{Output: strings.ReplaceAll(diagnostics.String(), dir, ".")}
		}
		return nil, fmt.Errorf("run typst: %w", err)
	}

	pdf, err := os.ReadFile(filepath.Join(dir, "out.pdf"))
	if err != nil {
		return nil, fmt.Errorf("read pdf: %w", err)
	}
	return pdf, nil
}

const maxDiagnostics = 8 << 10 // 8 KiB

// limitedBuffer keeps at most maxDiagnostics bytes of what is written to it.
// It still reports every write as successful, so the child process is never
// blocked or failed because its output was too long.
type limitedBuffer struct {
	buf bytes.Buffer
}

func (b *limitedBuffer) Write(p []byte) (int, error) {
	if room := maxDiagnostics - b.buf.Len(); room > 0 {
		if len(p) > room {
			b.buf.Write(p[:room])
		} else {
			b.buf.Write(p)
		}
	}
	return len(p), nil
}

func (b *limitedBuffer) String() string {
	return b.buf.String()
}
