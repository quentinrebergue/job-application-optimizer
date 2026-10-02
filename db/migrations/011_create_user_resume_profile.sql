CREATE TABLE IF NOT EXISTS user_resume_profile (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  linkedin     TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  address      TEXT NOT NULL DEFAULT '',
  resume_title TEXT NOT NULL DEFAULT '',
  profile_text TEXT NOT NULL DEFAULT '',
  ai_context   TEXT NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
