CREATE TABLE IF NOT EXISTS login_attempts (
  email      TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 1,
  reset_at   TIMESTAMPTZ NOT NULL
);
