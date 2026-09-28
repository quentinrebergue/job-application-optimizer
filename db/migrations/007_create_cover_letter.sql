CREATE TABLE cover_letter_sentences (
  id         TEXT PRIMARY KEY,
  text       TEXT NOT NULL,
  category   TEXT NOT NULL,
  tags       TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jobs ADD COLUMN cover_letter JSONB NOT NULL DEFAULT '{"selected_sentence_ids":[],"generated_letter":"","ai_context":""}';
