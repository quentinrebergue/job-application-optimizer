package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"

	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/api"
	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/config"
	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/render"
	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/templates"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("fatal", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, err := config.Load(os.LookupEnv)
	if err != nil {
		return err
	}

	store, err := templates.NewBuiltin()
	if err != nil {
		return fmt.Errorf("load templates: %w", err)
	}

	renderer := render.New(render.Config{
		Binary:        cfg.TypstBinary,
		FontPath:      cfg.FontPath,
		Timeout:       cfg.RenderTimeout,
		MaxConcurrent: cfg.MaxConcurrent,
	})
	startupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	version, err := renderer.Version(startupCtx)
	cancel()
	if err != nil {
		return fmt.Errorf("typst is not usable: %w", err)
	}

	reg := prometheus.NewRegistry()
	reg.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)
	srv := api.New(store, renderer, reg, logger)

	httpServer := &http.Server{
		Addr:              cfg.Addr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      cfg.RenderTimeout + 15*time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", cfg.Addr, "typst", version, "templates", len(store.List()))
		serveErr <- httpServer.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return fmt.Errorf("server stopped: %w", err)
	case <-ctx.Done():
	}
	// From here on a second signal kills the process immediately.
	stop()

	logger.Info("shutting down", "readiness_delay", cfg.ShutdownDelay.String())
	srv.SetReady(false)
	time.Sleep(cfg.ShutdownDelay)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.RenderTimeout+5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	logger.Info("stopped")
	return nil
}
