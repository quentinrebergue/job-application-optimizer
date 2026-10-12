// Package api is the HTTP face of the service: two routes that take a password and two for the probes.
//
// A password, or a hash, never reaches a log: the request log holds the method, the path, the status and the
// duration, and the errors are logged without the body that caused them.
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

	"github.com/quentinrebergue/job-application-optimizer/services/password-hasher/internal/hasher"
)

// A password the app accepts is far shorter; the margin is for a JSON escape of every character.
const maxBodyBytes = 4 << 10

// statusClientClosedRequest is nginx's convention for "the client went away".
const statusClientClosedRequest = 499

// Hasher is what the handlers need from the hashing layer; *hasher.Hasher satisfies it and tests use a fake.
type Hasher interface {
	Hash(ctx context.Context, password []byte) (string, error)
	Verify(ctx context.Context, password []byte, hash string) (bool, error)
}

type Server struct {
	hasher Hasher
	logger *slog.Logger
	ready  atomic.Bool
}

func New(h Hasher, logger *slog.Logger) *Server {
	s := &Server{hasher: h, logger: logger}
	s.ready.Store(true)
	return s
}

// SetReady controls /readyz. It is switched off at the start of a shutdown so Kubernetes stops sending
// new traffic before the server stops listening.
func (s *Server) SetReady(ready bool) { s.ready.Store(ready) }

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /hash", s.handleHash)
	mux.HandleFunc("POST /verify", s.handleVerify)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { io.WriteString(w, "ok") })
	mux.HandleFunc("GET /readyz", s.handleReadyz)
	return s.logRequests(mux)
}

type hashRequest struct {
	Password string `json:"password"`
}

type verifyRequest struct {
	Password string `json:"password"`
	Hash     string `json:"hash"`
}

func (s *Server) handleHash(w http.ResponseWriter, r *http.Request) {
	var req hashRequest
	if !decode(w, r, &req) {
		return
	}
	if req.Password == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "password is required")
		return
	}
	hash, err := s.hasher.Hash(r.Context(), []byte(req.Password))
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"hash": hash})
}

func (s *Server) handleVerify(w http.ResponseWriter, r *http.Request) {
	var req verifyRequest
	if !decode(w, r, &req) {
		return
	}
	if req.Hash == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "hash is required")
		return
	}
	valid, err := s.hasher.Verify(r.Context(), []byte(req.Password), req.Hash)
	if err != nil {
		s.fail(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"valid": valid})
}

// fail answers an error of the hashing layer. A busy hasher is told apart from every other failure so that the
// caller retries it and never reads it as a wrong password.
func (s *Server) fail(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, hasher.ErrBusy):
		w.Header().Set("Retry-After", "1")
		writeError(w, http.StatusServiceUnavailable, "busy", "the hasher is at capacity, retry shortly")
	case errors.Is(err, context.Canceled):
		writeError(w, statusClientClosedRequest, "client_closed_request", "")
	case errors.Is(err, context.DeadlineExceeded):
		writeError(w, http.StatusGatewayTimeout, "timeout", "the wait for a free slot took too long")
	case errors.Is(err, hasher.ErrInvalidHash):
		writeError(w, http.StatusUnprocessableEntity, "invalid_hash", "the hash is not a bcrypt hash")
	default:
		s.logger.Error("hashing failed", "error", err.Error())
		writeError(w, http.StatusInternalServerError, "internal_error", "")
	}
}

func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
	if !s.ready.Load() {
		w.WriteHeader(http.StatusServiceUnavailable)
		io.WriteString(w, "shutting down")
		return
	}
	io.WriteString(w, "ready")
}

// decode reads a JSON body of at most maxBodyBytes into dst, refusing fields it does not know. It writes the
// error answer itself and says whether the caller may go on.
func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "payload_too_large", "")
		} else {
			// The decoder's message can quote the text it choked on: never sent back, never logged.
			writeError(w, http.StatusBadRequest, "invalid_request", "the body is not the expected JSON")
		}
		return false
	}
	return true
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
		s.logger.Info("request", "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration_ms", time.Since(start).Milliseconds())
	})
}
