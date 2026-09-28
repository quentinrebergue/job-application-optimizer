CREATE TABLE knowledge (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  explanation TEXT NOT NULL DEFAULT ''
);
