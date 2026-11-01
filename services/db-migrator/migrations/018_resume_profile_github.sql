-- The GitHub address of the profile (#322), printed next to the LinkedIn one on the resume. Empty = nothing printed.
-- A column with a default: the rows already there are not rewritten.
ALTER TABLE user_resume_profile ADD COLUMN IF NOT EXISTS github TEXT NOT NULL DEFAULT '';
