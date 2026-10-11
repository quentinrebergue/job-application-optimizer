-- Every AI call (#203): who, which model, how many tokens, what it cost. It feeds the per-user
-- limits (calls per hour, day and week) and the global monthly cap in euros.
--
-- A call is written before it is made (status 'reserved', at its worst-case cost, so ten calls at
-- once cannot all pass the cap) and settled after it (done: the real tokens and cost; failed: 0,
-- or the cost of the prompt alone after a timeout, which the provider may have billed).
--
-- The rows outlive their user (SET NULL, not CASCADE): the money spent is still spent.
CREATE TABLE IF NOT EXISTS ai_usage (
  id                BIGSERIAL PRIMARY KEY,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  feature           TEXT NOT NULL,
  model             TEXT,
  status            TEXT NOT NULL CHECK (status IN ('reserved', 'done', 'failed')),
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_eur          NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The windows of one user, and the spend of the month.
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON ai_usage (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage (created_at);
