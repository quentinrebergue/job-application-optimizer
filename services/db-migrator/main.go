// Command db-migrator applies the SQL migrations embedded in the binary to the
// database named by DATABASE_URL. It is meant to run as a Kubernetes Job.
package main

import (
	"context"
	"embed"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/quentinrebergue/job-application-optimizer/services/db-migrator/internal/migrate"
)

// The migrations are compiled into the binary, so the image needs no files and
// always carries exactly the migrations of the commit it was built from.
//
//go:embed migrations/*.sql
var migrationsFS embed.FS

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("migration failed", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	baselineThrough := flag.String("baseline-through", "",
		"record migrations up to this version as already applied, without running them")
	flag.Parse()

	url, ok := os.LookupEnv("DATABASE_URL")
	if !ok || url == "" {
		return fmt.Errorf("DATABASE_URL is not set")
	}

	// Cancelled on SIGTERM/SIGINT, so a Job that Kubernetes stops releases its
	// connection (and with it the advisory lock) instead of being killed hard.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
	defer stop()

	connectCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	conn, err := pgx.Connect(connectCtx, url)
	if err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}
	defer conn.Close(context.Background())

	migrations, err := migrate.Load(migrationsFS, "migrations")
	if err != nil {
		return err
	}

	if *baselineThrough != "" {
		recorded, err := migrate.Baseline(ctx, conn, migrations, *baselineThrough, logger)
		if err != nil {
			return err
		}
		logger.Info("baseline done", "recorded", len(recorded))
		return nil
	}

	ran, err := migrate.Run(ctx, conn, migrations, logger)
	if err != nil {
		return err
	}
	logger.Info("migrations up to date", "applied", len(ran), "known", len(migrations))
	return nil
}
