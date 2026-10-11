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

	"github.com/quentinrebergue/job-application-optimizer/services/ai-gateway/internal/api"
	"github.com/quentinrebergue/job-application-optimizer/services/ai-gateway/internal/config"
	"github.com/quentinrebergue/job-application-optimizer/services/ai-gateway/internal/llm"
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

	client := llm.NewOVH(llm.OVHOptions{
		BaseURL:        cfg.BaseURL,
		Token:          cfg.Token,
		Model:          cfg.Model,
		AttemptTimeout: cfg.AttemptTimeout,
		MaxRetries:     cfg.MaxRetries,
		Backoff:        500 * time.Millisecond,
	})
	if !cfg.Enabled {
		logger.Warn("the AI is disabled (AI_ENABLED=false): every completion is refused")
	}
	srv := api.New(client, api.Limits{
		Disabled:        !cfg.Enabled,
		MaxPromptChars:  cfg.MaxPromptChars,
		MaxOutputTokens: cfg.MaxOutputTokens,
		Timeout:         cfg.RequestTimeout,
	}, logger)

	httpServer := &http.Server{
		Addr:              cfg.Addr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      cfg.RequestTimeout + 15*time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", cfg.Addr, "model", cfg.Model)
		serveErr <- httpServer.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return fmt.Errorf("server stopped: %w", err)
	case <-ctx.Done():
	}
	stop()

	logger.Info("shutting down", "readiness_delay", cfg.ShutdownDelay.String())
	srv.SetReady(false)
	time.Sleep(cfg.ShutdownDelay)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.RequestTimeout+5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	logger.Info("stopped")
	return nil
}
