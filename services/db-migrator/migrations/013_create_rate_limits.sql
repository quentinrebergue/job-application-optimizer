-- Counters for rate limits (#126): one row per key, e.g. "reset-ip:203.0.113.7".
-- A fixed window: the count goes back to 1 once reset_at has passed.
CREATE TABLE IF NOT EXISTS rate_limits (
  key      TEXT PRIMARY KEY,
  count    INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL
);

-- To delete expired rows from time to time.
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits (reset_at);
