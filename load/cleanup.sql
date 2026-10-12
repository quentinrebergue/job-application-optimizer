-- Removes the accounts made by seed.sql and everything that hangs on them (sessions, library, jobs, profile).
-- The rows of ai_usage, if any, stay without a user, like those of any deleted account.
\set ON_ERROR_STOP on
DELETE FROM users WHERE email LIKE 'loadtest-%@loadtest.invalid';
