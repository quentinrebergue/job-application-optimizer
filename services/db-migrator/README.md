# services/db-migrator

Applies the SQL migrations to the database named by `DATABASE_URL`. The migrations are compiled into the binary, so an image always carries the migrations of the commit it was built from. It runs as an Argo CD pre-sync Job.

| Path | Description |
|---|---|
| `main.go` | Reads `DATABASE_URL`, applies what is missing; `-baseline-through <version>` records migrations as applied without running them |
| `migrations/` | `NNN_name.sql`, in order, applied exactly once each |
| `internal/migrate/` | Loads the migrations, takes an advisory lock so that two runs cannot overlap, applies them in order and records them |
| `Dockerfile`, `.dockerignore`, `go.mod`, `go.sum` | The image and the module |
