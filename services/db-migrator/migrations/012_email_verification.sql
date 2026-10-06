-- Email confirmation (#125) and, later, password reset (#126).

-- NULL until the user opens the link of the confirmation mail.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Accounts created before this migration are trusted as they are.
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;

-- Single-use links sent by mail. Only the SHA-256 of the token is stored: a
-- leaked table gives no usable link.
CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose    TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_user_purpose ON email_tokens (user_id, purpose, created_at);
