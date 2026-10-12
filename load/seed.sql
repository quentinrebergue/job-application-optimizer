-- The accounts of the load tests (load/README.md): N users with a small library, three jobs, a profile and a session
-- each, all at an address ending in @loadtest.invalid (an address that cannot exist), so that cleanup.sql removes
-- exactly them and everything that hangs on them. Run it with load/seed.sh, which gives the variables:
--   :count   how many users
--   :pwhash  the bcrypt hash of the password the login scenario uses
-- It prints one line of JSON at the end: the accounts, to save as load/.accounts.json.
-- Running it again adds new sessions and keeps the users and their data.
\set ON_ERROR_STOP on
SET client_min_messages = warning;
BEGIN;

INSERT INTO users (email, password_hash, email_verified_at)
SELECT 'loadtest-' || g || '@loadtest.invalid', :'pwhash', now()
FROM generate_series(1, :count) g
-- A second seed with another LOAD_PASSWORD must change the password of the accounts already there.
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

CREATE TEMP TABLE lt_users AS
  SELECT id, split_part(split_part(email, '-', 2), '@', 1) AS n, email
  FROM users WHERE email LIKE 'loadtest-%@loadtest.invalid';

INSERT INTO user_resume_profile (user_id, full_name, email, linkedin, phone, address, resume_title, profile_text, ai_context)
SELECT id, 'Load Test ' || n, email, '', '', 'Paris, France', 'Software Engineer',
       'A short profile, written for a load test: it says nothing true about anybody.', ''
FROM lt_users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO entities (id, user_id, type, tags, latex_snippet, data)
SELECT 'exp-lt' || u.n || '-' || k, u.id, 'experiences', ARRAY['Go', 'Kubernetes', 'PostgreSQL'], '',
       jsonb_build_object('title', 'Software Engineer ' || k, 'company', 'Example Corp', 'location', 'Paris', 'period', '2023 - Now',
         'description', 'Built and ran backend services in Go on Kubernetes. Wrote the deployment pipeline, cut the build time in half and took part in the on-call rotation. Worked with PostgreSQL, Redis and a small team of five engineers.')
FROM lt_users u, generate_series(1, 2) k
ON CONFLICT (id) DO NOTHING;

INSERT INTO entities (id, user_id, type, tags, latex_snippet, data)
SELECT 'proj-lt' || u.n || '-' || k, u.id, 'projects', ARRAY['TypeScript', 'React'], '',
       jsonb_build_object('title', 'Side project ' || k, 'tech', jsonb_build_array('TypeScript', 'React', 'PostgreSQL'),
         'description', 'A small web application with accounts, a database and a deployment of its own. Handles a few hundred users and runs on a single small server.')
FROM lt_users u, generate_series(1, 2) k
ON CONFLICT (id) DO NOTHING;

INSERT INTO entities (id, user_id, type, tags, latex_snippet, data)
SELECT 'skill-lt' || u.n, u.id, 'skills', ARRAY['Go', 'TypeScript', 'SQL'], '',
       jsonb_build_object('name', 'Languages', 'category', 'Programming', 'level', 'advanced', 'tags', jsonb_build_array('Go', 'TypeScript', 'SQL'))
FROM lt_users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO entities (id, user_id, type, tags, latex_snippet, data)
SELECT 'edu-lt' || u.n, u.id, 'education', ARRAY[]::text[], '',
       jsonb_build_object('degree', 'MSc Computer Science', 'institution', 'Example University', 'period', '2018 - 2023')
FROM lt_users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO jobs (id, user_id, company, title, description, location, url, status, tags, ats_tags, resume_config)
SELECT 'job-lt' || u.n || '-' || k, u.id, 'Company ' || k, 'Backend Engineer ' || k,
       'We are looking for a backend engineer to build services in Go, run them on Kubernetes and keep a PostgreSQL database healthy. You will work with a small team, own what you ship and take part in the on-call rotation.',
       'Paris', 'https://example.invalid/jobs/' || k, 'saved', ARRAY[]::text[], ARRAY[]::text[],
       jsonb_build_object('selected_entity_ids', (SELECT jsonb_agg(e.id ORDER BY e.id) FROM entities e WHERE e.user_id = u.id),
                          'ai_rankings', '[]'::jsonb, 'profile_text', '')
FROM lt_users u, generate_series(1, 3) k
ON CONFLICT (id) DO NOTHING;

-- A session each, valid three hours: long enough for a run, short enough to be harmless if cleanup is forgotten.
INSERT INTO sessions (id, user_id, expires_at)
SELECT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), id, now() + interval '3 hours'
FROM lt_users;

-- A run of the login scenario leaves counters behind (an attempt counts until it is settled): seeding again clears them.
DELETE FROM login_attempts WHERE email LIKE 'loadtest-%@loadtest.invalid';

COMMIT;

SELECT json_build_object('users', json_agg(json_build_object(
  'email', u.email,
  'session', (SELECT s.id FROM sessions s WHERE s.user_id = u.id ORDER BY s.created_at DESC, s.id LIMIT 1),
  'jobs', (SELECT json_agg(j.id ORDER BY j.id) FROM jobs j WHERE j.user_id = u.id),
  'experiences', (SELECT json_agg(e.id ORDER BY e.id) FROM entities e WHERE e.user_id = u.id AND e.type = 'experiences'),
  'projects', (SELECT json_agg(e.id ORDER BY e.id) FROM entities e WHERE e.user_id = u.id AND e.type = 'projects')
) ORDER BY u.n::int))
FROM (SELECT id, n, email FROM users JOIN (SELECT split_part(split_part(email, '-', 2), '@', 1) AS n, id AS uid FROM users WHERE email LIKE 'loadtest-%@loadtest.invalid') x ON x.uid = users.id) u;
