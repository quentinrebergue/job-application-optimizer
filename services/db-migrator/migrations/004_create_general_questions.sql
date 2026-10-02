CREATE TABLE IF NOT EXISTS general_questions (
  id       TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer   TEXT NOT NULL,
  tags     TEXT[] NOT NULL DEFAULT '{}'
);
