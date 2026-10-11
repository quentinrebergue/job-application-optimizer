-- Change of email address from the account page (#236). The link goes to the NEW address and carries
-- it: the address of the account changes only when that link is opened, so the pending address lives
-- in the token (single use, expires), not in a column of users.
ALTER TABLE email_tokens ADD COLUMN IF NOT EXISTS new_email TEXT;

-- The purposes allowed gain 'change-email'. The constraint of 012 has the name Postgres gave it.
ALTER TABLE email_tokens DROP CONSTRAINT IF EXISTS email_tokens_purpose_check;
ALTER TABLE email_tokens ADD CONSTRAINT email_tokens_purpose_check CHECK (purpose IN ('verify', 'reset', 'change-email'));
