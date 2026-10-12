-- The history of the AI calls, kept after the calls themselves are deleted (#213). ai_usage keeps one row per call
-- (who, when, which model, tokens, cost) for the current and the previous calendar month: the limits per person need
-- a week of them and the monthly cap the current month. When a month leaves, its rows are replaced by one row here
-- per model, in the same statement that deletes them (src/lib/maintenance.ts), so the totals are exactly the sum of
-- what was deleted. No user_id: nothing here is personal data, so it is kept for good.
CREATE TABLE IF NOT EXISTS ai_usage_monthly (
  month             DATE NOT NULL,
  model             TEXT NOT NULL,
  calls             INTEGER NOT NULL,
  prompt_tokens     BIGINT NOT NULL,
  completion_tokens BIGINT NOT NULL,
  cost_eur          NUMERIC(12, 6) NOT NULL,
  PRIMARY KEY (month, model)
);
