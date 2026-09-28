CREATE TABLE exercises (
  id                     TEXT PRIMARY KEY,
  title                  TEXT NOT NULL,
  difficulty             TEXT NOT NULL,
  knowledge_ids          TEXT[] NOT NULL DEFAULT '{}',
  tags                   TEXT[] NOT NULL DEFAULT '{}',
  category               TEXT,
  leetcode               INTEGER,
  pattern_justifications JSONB,
  description            TEXT NOT NULL DEFAULT '',
  steps                  TEXT NOT NULL DEFAULT '',
  code                   TEXT NOT NULL DEFAULT ''
);
