// Package api is the HTTP face of the service: one route that takes the bytes of a PDF and gives back its text, and the probes.
//
// Neither the file nor the text reaches a log: a request is logged with its method, its path, its status, the size of the
// body and the duration, and an error is logged without the data that caused it.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/quentinrebergue/job-application-optimizer/services/pdf-text/internal/reader"
)

// statusClientClosedRequest is nginx's convention for "the client went away".
const statusClientClosedRequest = 499

// Reader is what the handlers need from the reading layer; *reader.Reader satisfies it and tests use a fake.
type Reader interface {
	Text(ctx context.Context, data []byte) (reader.Result, error)
}

type Server struct {
	reader   atomic.Pointer[Reader]
	maxBytes int64
	logger   *slog.Logger
	ready    atomic.Bool
}

// New makes the server. It is not ready until SetReader is called: the module of pdfium takes a few seconds to load, and the
// probe /readyz says so, while /healthz already answers.
func New(maxBytes int64, logger *slog.Logger) *Server {
	return &Server{maxBytes: maxBytes, logger: logger}
}

// SetReader gives the server its reader and makes it ready.
func (s *Server) SetReader(r Reader) {
	s.reader.Store(&r)
	s.ready.Store(true)
}

// SetReady controls /readyz. It is switched off at the start of a shutdown so Kubernetes stops sending
// new traffic before the server stops listening.
func (s *Server) SetReady(ready bool) { s.ready.Store(ready) }

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /extract", s.handleExtract)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { io.WriteString(w, "ok") })
	mux.HandleFunc("GET /readyz", s.handleReadyz)
	return s.logRequests(mux)
}

type extractResponse struct {
	Text      string `json:"text"`
	Pages     int    `json:"pages"`
	PagesRead int    `json:"pages_read"`
	Truncated bool   `json:"truncated"`
}

func (s *Server) handleExtract(w http.ResponseWriter, r *http.Request) {
	rd := s.reader.Load()
	if rd == nil {
		w.Header().Set("Retry-After", "5")
		writeError(w, http.StatusServiceUnavailable, "starting", "the service is starting")
		return
	}
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, s.maxBytes))
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "payload_too_large", "the PDF is too large")
		} else {
			writeError(w, http.StatusBadRequest, "unreadable_body", "the body could not be read")
		}
		return
	}
	res, err := (*rd).Text(r.Context(), data)
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, extractResponse{Text: res.Text, Pages: res.Pages, PagesRead: res.PagesRead, Truncated: res.Truncated})
}

// fail answers an error of the reading layer. Each case has its own code, so that the app can tell the user what to do.
func (s *Server) fail(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, reader.ErrNotPDF):
		writeError(w, http.StatusUnsupportedMediaType, "not_a_pdf", "the file is not a PDF")
	case errors.Is(err, reader.ErrNoText):
		writeError(w, http.StatusUnprocessableEntity, "no_text", "the PDF holds no text: it may be a picture")
	case errors.Is(err, reader.ErrUnreadable):
		writeError(w, http.StatusUnprocessableEntity, "unreadable", "the PDF is damaged or protected by a password")
	case errors.Is(err, reader.ErrBusy):
		w.Header().Set("Retry-After", "2")
		writeError(w, http.StatusServiceUnavailable, "busy", "too many files at once, retry shortly")
	case errors.Is(err, reader.ErrTimeout):
		writeError(w, http.StatusGatewayTimeout, "timeout", "the PDF took too long to read")
	case errors.Is(err, context.Canceled):
		writeError(w, statusClientClosedRequest, "client_closed_request", "")
	default:
		s.logger.Error("reading failed", "error", err.Error())
		writeError(w, http.StatusInternalServerError, "internal_error", "")
	}
}

func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
	if !s.ready.Load() {
		w.WriteHeader(http.StatusServiceUnavailable)
		io.WriteString(w, "not ready")
		return
	}
	io.WriteString(w, "ready")
}

type apiError struct {
	Code    string `json:"error"`
	Message string `json:"message,omitempty"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, apiError{Code: code, Message: message})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// statusRecorder wraps a ResponseWriter to remember the status code.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// logRequests writes one line per request. Probes are skipped: Kubernetes calls them every few seconds.
func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		if r.URL.Path == "/healthz" || r.URL.Path == "/readyz" {
			return
		}
		s.logger.Info("request", "method", r.Method, "path", r.URL.Path, "status", rec.status, "bytes", r.ContentLength, "duration_ms", time.Since(start).Milliseconds())
	})
}
