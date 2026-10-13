// Package reader reads the text of a PDF with pdfium compiled to WebAssembly (go-pdfium, run by wazero).
//
// A PDF is a file made by someone else and the reader is a C++ library: here it runs inside the memory sandbox of
// WebAssembly, in a container with no network. The file is read from memory, never written anywhere. One file at a time
// (a short queue waits, past it the answer is "busy"), the first pages only, a time limit that is a hard one: a file that
// takes too long closes the module, and a new one is started.
package reader

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"regexp"
	"runtime/debug"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"unicode"

	pdfium "github.com/klippa-app/go-pdfium"
	"github.com/klippa-app/go-pdfium/references"
	"github.com/klippa-app/go-pdfium/requests"
	"github.com/klippa-app/go-pdfium/webassembly"
	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
	"github.com/tetratelabs/wazero/experimental"
)

var (
	ErrNotPDF     = errors.New("reader: not a PDF")
	ErrUnreadable = errors.New("reader: the PDF cannot be read (damaged or protected by a password)")
	ErrNoText     = errors.New("reader: the PDF holds no text (a picture?)")
	ErrTimeout    = errors.New("reader: the PDF took too long to read")
	ErrBusy       = errors.New("reader: busy, too many files waiting")
)

type Options struct {
	MaxPages     int           // only the first pages are read
	MaxChars     int           // the text is cut here
	MinTextChars int           // letters and digits under which a PDF is taken for a picture
	MaxQueue     int           // files that may wait for the reader
	Timeout      time.Duration // the longest a file may take, to read
	CacheDir     string        // where wazero keeps the compiled module ("" = nowhere)
}

type Result struct {
	Text      string
	Pages     int  // pages of the file
	PagesRead int  // pages read (at most MaxPages)
	Truncated bool // the text was cut: pages left out, or MaxChars reached
}

type Reader struct {
	opt     Options
	slot    chan struct{} // one token: one file at a time
	waiting atomic.Int32
	maxWait int32

	// The module of pdfium. It is replaced after a file that took too long.
	mu     sync.Mutex
	pool   pdfium.Pool
	inst   pdfium.Pdfium
	cancel context.CancelFunc
}

// New compiles (or loads from the cache) the module of pdfium and returns a reader ready to work. The first start without a
// cache takes a few seconds and a lot of memory for a moment: bound the process with GOMEMLIMIT.
func New(opt Options) (*Reader, error) {
	r := &Reader{opt: opt, slot: make(chan struct{}, 1), maxWait: int32(opt.MaxQueue)}
	if err := r.start(); err != nil {
		return nil, err
	}
	return r, nil
}

func (r *Reader) runtimeConfig() (wazero.RuntimeConfig, error) {
	// pdfium needs exception handling; CloseOnContextDone lets a file that takes too long be stopped.
	features := api.CoreFeaturesV2 | experimental.CoreFeaturesExceptionHandling
	cfg := wazero.NewRuntimeConfig().WithCoreFeatures(features).WithCloseOnContextDone(true)
	if r.opt.CacheDir != "" {
		cache, err := wazero.NewCompilationCacheWithDir(r.opt.CacheDir)
		if err != nil {
			return nil, fmt.Errorf("compilation cache %s: %w", r.opt.CacheDir, err)
		}
		cfg = cfg.WithCompilationCache(cache)
	}
	return cfg, nil
}

func (r *Reader) start() error {
	cfg, err := r.runtimeConfig()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithCancel(context.Background())
	pool, err := webassembly.Init(webassembly.Config{Context: ctx, MinIdle: 1, MaxIdle: 1, MaxTotal: 1, RuntimeConfig: cfg})
	if err != nil {
		cancel()
		return fmt.Errorf("start pdfium: %w", err)
	}
	inst, err := pool.GetInstance(30 * time.Second)
	if err != nil {
		pool.Close()
		cancel()
		return fmt.Errorf("get an instance of pdfium: %w", err)
	}
	r.pool, r.inst, r.cancel = pool, inst, cancel
	// Compiling the module leaves a lot of garbage: give it back at once.
	debug.FreeOSMemory()
	return nil
}

// restart throws the module away, which stops whatever it is doing, and starts a new one.
func (r *Reader) restart() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.cancel()
	r.pool.Close()
	return r.start()
}

func (r *Reader) Close() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.cancel()
	r.pool.Close()
}

// acquire takes the place of the reader: at once if it is free, else after waiting in the short queue, else ErrBusy.
func (r *Reader) acquire(ctx context.Context) error {
	select {
	case r.slot <- struct{}{}:
		return nil
	default:
	}
	if r.waiting.Add(1) > r.maxWait {
		r.waiting.Add(-1)
		return ErrBusy
	}
	defer r.waiting.Add(-1)
	select {
	case r.slot <- struct{}{}:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (r *Reader) release() { <-r.slot }

// Text reads the text of the first pages of a PDF.
func (r *Reader) Text(ctx context.Context, data []byte) (Result, error) {
	// A PDF starts with "%PDF-" in its first kilobyte (the format allows a little junk before it).
	head := data
	if len(head) > 1024 {
		head = head[:1024]
	}
	if !bytes.Contains(head, []byte("%PDF-")) {
		return Result{}, ErrNotPDF
	}
	if err := r.acquire(ctx); err != nil {
		return Result{}, err
	}
	defer r.release()

	type outcome struct {
		res Result
		err error
	}
	done := make(chan outcome, 1)
	r.mu.Lock()
	inst := r.inst
	r.mu.Unlock()
	go func() {
		res, err := r.extract(inst, data)
		done <- outcome{res, err}
	}()

	select {
	case o := <-done:
		return o.res, o.err
	case <-time.After(r.opt.Timeout):
	case <-ctx.Done():
	}
	// Too long, or the caller left: stop the module, which ends the goroutine, and start a new one.
	err := r.restart()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
	}
	if err != nil {
		return Result{}, fmt.Errorf("restart after a timeout: %w", err)
	}
	if ctx.Err() != nil {
		return Result{}, ctx.Err()
	}
	return Result{}, ErrTimeout
}

func (r *Reader) extract(inst pdfium.Pdfium, data []byte) (Result, error) {
	doc, err := inst.OpenDocument(&requests.OpenDocument{File: &data})
	if err != nil {
		return Result{}, ErrUnreadable
	}
	defer inst.FPDF_CloseDocument(&requests.FPDF_CloseDocument{Document: doc.Document})
	count, err := inst.FPDF_GetPageCount(&requests.FPDF_GetPageCount{Document: doc.Document})
	if err != nil || count.PageCount < 1 {
		return Result{}, ErrUnreadable
	}
	read := min(count.PageCount, r.opt.MaxPages)
	var sb strings.Builder
	for i := 0; i < read; i++ {
		text, err := pageText(inst, doc.Document, i)
		if err != nil {
			return Result{}, ErrUnreadable
		}
		sb.WriteString(text)
		sb.WriteString("\n\n")
	}
	text := tidy(sb.String())
	if letters(text) < r.opt.MinTextChars {
		return Result{}, ErrNoText
	}
	truncated := count.PageCount > read
	if r.opt.MaxChars > 0 && len([]rune(text)) > r.opt.MaxChars {
		text = string([]rune(text)[:r.opt.MaxChars])
		truncated = true
	}
	return Result{Text: text, Pages: count.PageCount, PagesRead: read, Truncated: truncated}, nil
}

// pageText is the text of a page in reading order, from the place of each fragment on it (layout.go). When the
// places are not there, or give next to nothing, it is the text as the file stores it: a worse order is better
// than no text.
func pageText(inst pdfium.Pdfium, doc references.FPDF_DOCUMENT, index int) (string, error) {
	ref := requests.Page{ByIndex: &requests.PageByIndex{Document: doc, Index: index}}
	structured, err := inst.GetPageTextStructured(&requests.GetPageTextStructured{
		Page: ref, Mode: requests.GetPageTextStructuredModeRects, CollectFontInformation: true,
	})
	if err == nil {
		frags := make([]fragment, 0, len(structured.Rects))
		for _, r := range structured.Rects {
			f := fragment{text: r.Text, left: r.PointPosition.Left, right: r.PointPosition.Right, bottom: r.PointPosition.Bottom, top: r.PointPosition.Top}
			if r.FontInformation != nil {
				f.size = r.FontInformation.RenderedSize
			}
			frags = append(frags, f)
		}
		if text := layoutText(frags); letters(text) >= 30 {
			return text, nil
		}
	}
	page, err := inst.GetPageText(&requests.GetPageText{Page: ref})
	if err != nil {
		return "", err
	}
	return page.Text, nil
}

var (
	ligatures = strings.NewReplacer("ﬀ", "ff", "ﬁ", "fi", "ﬂ", "fl", "ﬃ", "ffi", "ﬄ", "ffl", " ", " ", "­", "", "​", "")
	manyLines = regexp.MustCompile(`\n{3,}`)
)

// tidy makes the text the same whatever the program that wrote the PDF: one kind of line break, no trailing spaces, no control
// characters, ligatures and non-breaking spaces written plainly, no more than one empty line in a row.
func tidy(s string) string {
	s = strings.ReplaceAll(strings.ReplaceAll(s, "\r\n", "\n"), "\r", "\n")
	s = ligatures.Replace(s)
	s = strings.Map(func(r rune) rune {
		if r == '\n' || r == '\t' || !unicode.IsControl(r) {
			return r
		}
		return -1
	}, s)
	lines := strings.Split(s, "\n")
	for i, l := range lines {
		lines[i] = strings.TrimRight(l, " \t")
	}
	return strings.TrimSpace(manyLines.ReplaceAllString(strings.Join(lines, "\n"), "\n\n"))
}

// letters counts the letters and digits: a page of a picture gives a character or two, never thirty.
func letters(s string) int {
	n := 0
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			n++
		}
	}
	return n
}
