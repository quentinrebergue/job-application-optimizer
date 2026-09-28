CREATE TABLE IF NOT EXISTS entities (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('experiences','projects','skills','education')),
  tags          TEXT[] NOT NULL DEFAULT '{}',
  latex_snippet TEXT NOT NULL DEFAULT '',
  data          JSONB NOT NULL DEFAULT '{}',
  questions     JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities (type);
