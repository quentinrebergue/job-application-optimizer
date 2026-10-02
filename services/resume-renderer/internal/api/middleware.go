package api

import (
	"net/http"
	"time"
)

// statusRecorder wraps a ResponseWriter to remember the status code. Embedding
// http.ResponseWriter gives it all the interface's methods for free; only
// WriteHeader is overridden.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// logRequests writes one structured log line per request. Probes and metrics
// scrapes are skipped: Kubernetes calls them every few seconds and they would
// bury the real traffic.
func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(rec, r)

		switch r.URL.Path {
		case "/healthz", "/readyz", "/metrics":
			return
		}
		s.logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}
