CREATE TABLE jobs (
  id            TEXT PRIMARY KEY,
  company       TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  location      TEXT,
  url           TEXT,
  status        TEXT NOT NULL DEFAULT 'saved',
  date_added    TIMESTAMPTZ NOT NULL DEFAULT now(),
  tags          TEXT[] NOT NULL DEFAULT '{}',
  ats_tags      TEXT[] NOT NULL DEFAULT '{}',
  ai_analysis   JSONB,
  resume_config JSONB NOT NULL DEFAULT '{"selected_entity_ids":[],"ai_rankings":[],"profile_text":""}',
  questions     JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_jobs_status ON jobs (status);
