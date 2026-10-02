package migrate

import (
	"context"
	"io"
	"log/slog"
	"os"
	"testing"
	"testing/fstest"

	"github.com/jackc/pgx/v5"
)

// testConn connects to the throwaway database named by TEST_DATABASE_URL and
// wipes it, so every test starts from an empty schema. Without the variable
// the test is skipped, so `go test` still passes on a machine with no Postgres.
func testConn(t *testing.T) *pgx.Conn {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close(ctx) })
	if _, err := conn.Exec(ctx, "DROP SCHEMA public CASCADE; CREATE SCHEMA public"); err != nil {
		t.Fatal(err)
	}
	return conn
}

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

func TestLoadSortsAndSkipsNonSQL(t *testing.T) {
	fsys := fstest.MapFS{
		"m/002_b.sql": {Data: []byte("SELECT 2")},
		"m/001_a.sql": {Data: []byte("SELECT 1")},
		"m/README.md": {Data: []byte("ignored")},
		"m/sub/x.sql": {Data: []byte("ignored")},
	}
	got, err := Load(fsys, "m")
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].Version != "001_a" || got[1].Version != "002_b" || got[0].SQL != "SELECT 1" {
		t.Fatalf("got %+v", got)
	}
}

func TestRunAppliesOnceAndInOrder(t *testing.T) {
	conn := testConn(t)
	ctx := context.Background()
	ms := []Migration{
		{"001_a", "CREATE TABLE a (id int); INSERT INTO a VALUES (1)"},
		{"002_b", "ALTER TABLE a ADD COLUMN name text; UPDATE a SET name = 'x'"},
	}
	ran, err := Run(ctx, conn, ms, quiet)
	if err != nil || len(ran) != 2 {
		t.Fatalf("first run: ran=%v err=%v", ran, err)
	}
	ran, err = Run(ctx, conn, ms, quiet)
	if err != nil || len(ran) != 0 {
		t.Fatalf("second run must be a no-op: ran=%v err=%v", ran, err)
	}
}

func TestRunRollsBackAFailingMigration(t *testing.T) {
	conn := testConn(t)
	ctx := context.Background()
	ms := []Migration{
		{"001_ok", "CREATE TABLE ok (id int)"},
		{"002_bad", "CREATE TABLE half (id int); SELECT 1/0"},
		{"003_never", "CREATE TABLE never (id int)"},
	}
	ran, err := Run(ctx, conn, ms, quiet)
	if err == nil || len(ran) != 1 {
		t.Fatalf("want failure after one migration: ran=%v err=%v", ran, err)
	}
	var n int
	conn.QueryRow(ctx, "SELECT count(*) FROM information_schema.tables WHERE table_name IN ('half','never')").Scan(&n)
	if n != 0 {
		t.Fatalf("failing migration left %d tables behind", n)
	}
	// After fixing the bad one, a rerun applies it and the next.
	ms[1].SQL = "CREATE TABLE half (id int)"
	ran, err = Run(ctx, conn, ms, quiet)
	if err != nil || len(ran) != 2 {
		t.Fatalf("rerun: ran=%v err=%v", ran, err)
	}
}

func TestBaselineRecordsWithoutRunning(t *testing.T) {
	conn := testConn(t)
	ctx := context.Background()
	ms := []Migration{
		{"001_a", "CREATE TABLE a (id int)"},
		{"002_b", "CREATE TABLE b (id int)"},
		{"003_c", "CREATE TABLE c (id int)"},
	}
	if _, err := Baseline(ctx, conn, ms, "nope", quiet); err == nil {
		t.Fatal("unknown version must be rejected")
	}
	rec, err := Baseline(ctx, conn, ms, "002_b", quiet)
	if err != nil || len(rec) != 2 {
		t.Fatalf("baseline: rec=%v err=%v", rec, err)
	}
	ran, err := Run(ctx, conn, ms, quiet)
	if err != nil || len(ran) != 1 || ran[0] != "003_c" {
		t.Fatalf("only 003 must run: ran=%v err=%v", ran, err)
	}
	var n int
	conn.QueryRow(ctx, "SELECT count(*) FROM information_schema.tables WHERE table_name IN ('a','b')").Scan(&n)
	if n != 0 {
		t.Fatal("baselined migrations must not have run")
	}
}
