package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/model"
	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/render"
	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/templates"
)

const maxBodyBytes = 1 << 20 // 1 MiB

// statusClientClosedRequest is nginx's convention for "the client went away".
const statusClientClosedRequest = 499

// Renderer is what the handlers need from the rendering layer; *render.Typst
// satisfies it, and tests use a fake.
type Renderer interface {
	Render(ctx context.Context, source, data []byte) ([]byte, error)
}

type Server struct {
	store    templates.Store
	renderer Renderer
	metrics  *metrics
	gatherer prometheus.Gatherer
	logger   *slog.Logger
	ready    atomic.Bool
}

func New(store templates.Store, renderer Renderer, reg *prometheus.Registry, logger *slog.Logger) *Server {
	s := &Server{
		store:    store,
		renderer: renderer,
		metrics:  newMetrics(reg),
		gatherer: reg,
		logger:   logger,
	}
	s.ready.Store(true)
	return s
}

// SetReady controls /readyz. It is switched off at the start of a shutdown so
// Kubernetes stops sending new traffic before the server stops listening.
func (s *Server) SetReady(ready bool) {
	s.ready.Store(ready)
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /render", s.handleRender)
	mux.HandleFunc("GET /templates", s.handleTemplates)
	mux.HandleFunc("GET /healthz", s.handleHealthz)
	mux.HandleFunc("GET /readyz", s.handleReadyz)
	mux.Handle("GET /metrics", promhttp.HandlerFor(s.gatherer, promhttp.HandlerOpts{}))
	return s.logRequests(mux)
}

// apiError is both what the client receives (as JSON) and what we log.
type apiError struct {
	Status   int      `json:"-"`
	Code     string   `json:"error"`
	Message  string   `json:"message,omitempty"`
	Problems []string `json:"problems,omitempty"`

	outcome string // label for the renders_total metric
	cause   error  // logged, never sent to the client
}

func (s *Server) handleRender(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	if err != nil {
		aerr := &apiError{Status: http.StatusBadRequest, Code: "unreadable_body", outcome: "invalid", cause: err}
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			aerr = &apiError{Status: http.StatusRequestEntityTooLarge, Code: "payload_too_large",
				Message: "request body exceeds 1 MiB", outcome: "invalid"}
		}
		s.metrics.renders.WithLabelValues("unknown", aerr.outcome).Inc()
		writeJSON(w, aerr.Status, aerr)
		return
	}

	pdf, template, aerr := s.process(r.Context(), body)

	if aerr != nil {
		s.metrics.renders.WithLabelValues(template, aerr.outcome).Inc()
		if aerr.Status >= 500 {
			s.logger.Error("render failed", "template", template, "outcome", aerr.outcome, "error", aerr.cause)
		}
		if aerr.Status == http.StatusTooManyRequests {
			w.Header().Set("Retry-After", "1")
		}
		writeJSON(w, aerr.Status, aerr)
		return
	}

	s.metrics.renders.WithLabelValues(template, "ok").Inc()
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Length", strconv.Itoa(len(pdf)))
	w.Header().Set("Content-Disposition", `attachment; filename="resume.pdf"`)
	w.Write(pdf)
}

// process runs the whole pipeline for one request body. The returned template
// is a safe metrics label: a known template id, or "unknown".
func (s *Server) process(ctx context.Context, body []byte) (pdf []byte, template string, aerr *apiError) {
	template = "unknown"

	req, err := model.Decode(bytes.NewReader(body))
	if err != nil {
		var ve *model.ValidationError
		if errors.As(err, &ve) {
			return nil, template, &apiError{Status: http.StatusBadRequest, Code: "invalid_request", Problems: ve.Problems, outcome: "invalid"}
		}
		return nil, template, &apiError{Status: http.StatusInternalServerError, Code: "internal_error", outcome: "error", cause: err}
	}

	tpl, ok := s.store.Get(req.Template.ID)
	if !ok {
		return nil, template, &apiError{Status: http.StatusNotFound, Code: "unknown_template",
			Message: "no template with id " + strconv.Quote(req.Template.ID), outcome: "unknown_template"}
	}
	template = tpl.Manifest.ID

	options, err := templates.ResolveOptions(&tpl.Manifest, req.Options)
	if err != nil {
		var oe *templates.OptionsError
		if errors.As(err, &oe) {
			return nil, template, &apiError{Status: http.StatusBadRequest, Code: "invalid_options", Problems: oe.Problems, outcome: "invalid"}
		}
		return nil, template, &apiError{Status: http.StatusInternalServerError, Code: "internal_error", outcome: "error", cause: err}
	}

	data, err := render.BuildData(req, options)
	if err != nil {
		return nil, template, &apiError{Status: http.StatusInternalServerError, Code: "internal_error", outcome: "error", cause: err}
	}

	s.metrics.inFlight.Inc()
	start := time.Now()
	pdf, err = s.renderer.Render(ctx, tpl.Source, data)
	s.metrics.inFlight.Dec()
	if !errors.Is(err, render.ErrBusy) {
		s.metrics.duration.WithLabelValues(template).Observe(time.Since(start).Seconds())
	}

	if err == nil {
		return pdf, template, nil
	}
	var ce *render.CompileError
	switch {
	case errors.Is(err, render.ErrBusy):
		return nil, template, &apiError{Status: http.StatusTooManyRequests, Code: "busy",
			Message: "the renderer is at capacity, retry shortly", outcome: "busy"}
	case errors.Is(err, render.ErrTimeout):
		return nil, template, &apiError{Status: http.StatusGatewayTimeout, Code: "render_timeout",
			Message: "the render took too long", outcome: "timeout", cause: err}
	case errors.Is(err, context.Canceled):
		return nil, template, &apiError{Status: statusClientClosedRequest, Code: "client_closed_request", outcome: "canceled"}
	case errors.As(err, &ce):
		return nil, template, &apiError{Status: http.StatusUnprocessableEntity, Code: "template_error",
			Message: ce.Output, outcome: "compile_error", cause: err}
	default:
		return nil, template, &apiError{Status: http.StatusInternalServerError, Code: "internal_error", outcome: "error", cause: err}
	}
}

func (s *Server) handleTemplates(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"templates": s.store.List()})
}

func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	io.WriteString(w, "ok")
}

func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
	if !s.ready.Load() {
		w.WriteHeader(http.StatusServiceUnavailable)
		io.WriteString(w, "shutting down")
		return
	}
	w.WriteHeader(http.StatusOK)
	io.WriteString(w, "ready")
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
