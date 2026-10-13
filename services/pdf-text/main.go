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

	"github.com/quentinrebergue/job-application-optimizer/services/pdf-text/internal/api"
	"github.com/quentinrebergue/job-application-optimizer/services/pdf-text/internal/config"
	"github.com/quentinrebergue/job-application-optimizer/services/pdf-text/internal/reader"
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

	// The server listens at once and says "not ready" while pdfium loads: /healthz answers (the process is alive), /readyz does
	// not (no file can be read yet), so Kubernetes sends nothing until the module is compiled or read from its cache.
	srv := api.New(cfg.MaxBytes, logger)
	httpServer := &http.Server{
		Addr:              cfg.Addr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		// A file may wait in the queue behind the files in front of it, then be read within its own limit.
		WriteTimeout: 2*cfg.Timeout + 15*time.Second,
		IdleTimeout:  60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 2)
	go func() {
		logger.Info("listening", "addr", cfg.Addr, "max_bytes", cfg.MaxBytes, "max_pages", cfg.MaxPages, "timeout", cfg.Timeout.String(), "cache", cfg.CacheDir != "")
		serveErr <- httpServer.ListenAndServe()
	}()
	loaded := make(chan *reader.Reader, 1)
	go func() {
		start := time.Now()
		r, err := reader.New(reader.Options{MaxPages: cfg.MaxPages, MaxChars: cfg.MaxChars, MinTextChars: cfg.MinTextChars, MaxQueue: cfg.MaxQueue, Timeout: cfg.Timeout, CacheDir: cfg.CacheDir})
		if err != nil {
			serveErr <- fmt.Errorf("load pdfium: %w", err)
			return
		}
		srv.SetReader(r)
		logger.Info("ready", "pdfium_loaded_in", time.Since(start).Round(time.Millisecond).String())
		loaded <- r
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

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*cfg.Timeout+5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	select {
	case r := <-loaded:
		r.Close()
	default:
	}
	logger.Info("stopped")
	return nil
}
