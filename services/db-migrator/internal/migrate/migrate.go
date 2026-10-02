// Package migrate applies ordered SQL migrations to Postgres and records which
// ones have run, so that every migration is applied exactly once.
package migrate

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"path"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// lockID identifies our advisory lock. Any number works as long as every
// instance of the migrator uses the same one.
const lockID int64 = 727274

// Migration is one SQL file. Version is the file name without ".sql"
// (for example "011_create_user_resume_profile").
type Migration struct {
	Version string
	SQL     string
}

// Load reads every *.sql file in dir. fs.ReadDir returns the entries sorted by
// file name, and the zero-padded numeric prefixes make that the right order.
func Load(fsys fs.FS, dir string) ([]Migration, error) {
	entries, err := fs.ReadDir(fsys, dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}
	var migrations []Migration
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		body, err := fs.ReadFile(fsys, path.Join(dir, e.Name()))
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", e.Name(), err)
		}
		migrations = append(migrations, Migration{
			Version: strings.TrimSuffix(e.Name(), ".sql"),
			SQL:     string(body),
		})
	}
	return migrations, nil
}

// Run applies, in order, every migration that is not recorded yet. Each one
// runs in its own transaction together with its bookkeeping row: it is either
// fully applied and recorded, or not applied at all. It returns the versions
// it applied.
func Run(ctx context.Context, conn *pgx.Conn, migrations []Migration, logger *slog.Logger) ([]string, error) {
	unlock, err := lock(ctx, conn)
	if err != nil {
		return nil, err
	}
	defer unlock()

	if err := ensureTable(ctx, conn); err != nil {
		return nil, err
	}
	applied, err := appliedVersions(ctx, conn)
	if err != nil {
		return nil, err
	}

	var ran []string
	for _, m := range migrations {
		if applied[m.Version] {
			continue
		}
		logger.Info("applying migration", "version", m.Version)
		if err := apply(ctx, conn, m); err != nil {
			return ran, fmt.Errorf("migration %s: %w", m.Version, err)
		}
		ran = append(ran, m.Version)
	}
	return ran, nil
}

// Baseline records every migration up to and including `through` as applied
// without running it. It is for a database that was migrated by hand before
// this tool existed. It returns the versions it recorded.
func Baseline(ctx context.Context, conn *pgx.Conn, migrations []Migration, through string, logger *slog.Logger) ([]string, error) {
	known := false
	for _, m := range migrations {
		if m.Version == through {
			known = true
		}
	}
	if !known {
		return nil, fmt.Errorf("baseline: unknown migration %q", through)
	}

	unlock, err := lock(ctx, conn)
	if err != nil {
		return nil, err
	}
	defer unlock()

	if err := ensureTable(ctx, conn); err != nil {
		return nil, err
	}
	applied, err := appliedVersions(ctx, conn)
	if err != nil {
		return nil, err
	}

	var recorded []string
	for _, m := range migrations {
		if m.Version > through {
			break
		}
		if applied[m.Version] {
			continue
		}
		if _, err := conn.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", m.Version); err != nil {
			return recorded, fmt.Errorf("baseline %s: %w", m.Version, err)
		}
		logger.Info("baselined migration", "version", m.Version)
		recorded = append(recorded, m.Version)
	}
	return recorded, nil
}

// lock takes a Postgres advisory lock so two migrators started at the same
// time (two syncs, a retried Job) cannot interleave. The lock belongs to this
// connection and is released by the returned function.
func lock(ctx context.Context, conn *pgx.Conn) (func(), error) {
	if _, err := conn.Exec(ctx, "SELECT pg_advisory_lock($1)", lockID); err != nil {
		return nil, fmt.Errorf("take advisory lock: %w", err)
	}
	return func() {
		// ctx may already be cancelled (shutdown), so unlock with a fresh one.
		unlockCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, _ = conn.Exec(unlockCtx, "SELECT pg_advisory_unlock($1)", lockID)
	}, nil
}

func ensureTable(ctx context.Context, conn *pgx.Conn) error {
	_, err := conn.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version    TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`)
	if err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}
	return nil
}

func appliedVersions(ctx context.Context, conn *pgx.Conn) (map[string]bool, error) {
	rows, err := conn.Query(ctx, "SELECT version FROM schema_migrations")
	if err != nil {
		return nil, fmt.Errorf("list applied migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, fmt.Errorf("scan applied migration: %w", err)
		}
		applied[v] = true
	}
	return applied, rows.Err()
}

func apply(ctx context.Context, conn *pgx.Conn, m Migration) error {
	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	// After a successful Commit this is a harmless no-op.
	defer tx.Rollback(ctx) //nolint:errcheck

	if _, err := tx.Exec(ctx, m.SQL); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", m.Version); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
