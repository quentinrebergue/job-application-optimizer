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

	"github.com/quentinrebergue/job-application-optimizer/services/password-hasher/internal/api"
	"github.com/quentinrebergue/job-application-optimizer/services/password-hasher/internal/config"
	"github.com/quentinrebergue/job-application-optimizer/services/password-hasher/internal/hasher"
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

	srv := api.New(hasher.New(cfg.Cost, cfg.MaxConcurrent, cfg.MaxQueue), logger)
	httpServer := &http.Server{
		Addr:              cfg.Addr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       5 * time.Second,
		// A request may wait in the queue behind the hashes in front of it, then compute its own.
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", cfg.Addr, "cost", cfg.Cost, "max_concurrent", cfg.MaxConcurrent, "max_queue", cfg.MaxQueue)
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

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	logger.Info("stopped")
	return nil
}
