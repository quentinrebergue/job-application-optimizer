-- A demo account with a small library and a job, for a local stack (scripts/stack.sh seed): demo@example.test,
-- the password given by the caller (:pwhash, a bcrypt hash). Everything is fictional. Running it again resets the
-- password and keeps the rest.
\set ON_ERROR_STOP on
SET client_min_messages = warning;
BEGIN;

INSERT INTO users (email, password_hash, email_verified_at)
VALUES ('demo@example.test', :'pwhash', now())
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, email_verified_at = now();

CREATE TEMP TABLE demo_user AS SELECT id FROM users WHERE email = 'demo@example.test';

INSERT INTO user_resume_profile (user_id, full_name, email, linkedin, github, phone, address, resume_title, profile_text, ai_context)
SELECT id, 'Alex Morgan', 'alex.morgan@example.test', 'linkedin.com/in/alex-morgan', 'github.com/alex-morgan', '', 'Lyon, France',
       'Software Engineer',
       'Engineering student with a taste for systems and infrastructure. Builds small services in Go and TypeScript and runs them on Kubernetes.', ''
FROM demo_user
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO entities (id, user_id, type, tags, latex_snippet, data)
SELECT 'exp-demo-1', id, 'experiences', ARRAY['Go', 'Kubernetes', 'PostgreSQL'], '',
       jsonb_build_object('title', 'Backend Engineer Intern', 'company', 'Example Corp', 'location', 'Paris', 'period', '06/2025 - 09/2025',
         'description', E'Built a billing service in Go and moved it to Kubernetes.\n- Cut the p95 of the main endpoint from 800 ms to 120 ms\n- Wrote the deployment pipeline and the dashboards')
FROM demo_user
ON CONFLICT (id) DO NOTHING;

INSERT INTO entities (id, user_id, type, tags, latex_snippet, data)
SELECT 'exp-demo-2', id, 'experiences', ARRAY['Python', 'Linux'], '',
       jsonb_build_object('title', 'Teaching Assistant', 'company', 'Example School', 'location', 'Lyon', 'period', '09/2024 - Now',
         'description', 'Taught operating systems and C to 120 students and ran the practical sessions.')
FROM demo_user
ON CONFLICT (id) DO NOTHING;

INSERT INTO entities (id, user_id, type, tags, latex_snippet, data)
SELECT 'proj-demo-1', id, 'projects', ARRAY['C', 'Linux'], '',
       jsonb_build_object('title', 'myMalloc', 'url', 'https://github.com/alex-morgan/mymalloc', 'tech', jsonb_build_array('C', 'Linux'),
         'description', E'A memory allocator with a free list.\n- Fast path under 100 ns\n- Thread safe')
FROM demo_user
ON CONFLICT (id) DO NOTHING;

INSERT INTO entities (id, user_id, type, tags, latex_snippet, data)
SELECT 'proj-demo-2', id, 'projects', ARRAY['Go', 'Redis'], '',
       jsonb_build_object('title', 'Queue', 'url', '', 'tech', jsonb_build_array('Go', 'Redis'),
         'description', 'A job queue with retries and a dashboard, used by two small projects.')
FROM demo_user
ON CONFLICT (id) DO NOTHING;

INSERT INTO entities (id, user_id, type, tags, latex_snippet, data)
SELECT 'skill-demo-1', id, 'skills', ARRAY['Go', 'TypeScript', 'SQL'], '',
       jsonb_build_object('name', 'Languages', 'level', 'advanced', 'tags', jsonb_build_array('Go', 'TypeScript', 'SQL'))
FROM demo_user
ON CONFLICT (id) DO NOTHING;

INSERT INTO entities (id, user_id, type, tags, latex_snippet, data)
SELECT 'edu-demo-1', id, 'education', ARRAY[]::text[], '',
       jsonb_build_object('degree', 'MSc Computer Science', 'institution', 'Example University', 'period', '2021 - 2026')
FROM demo_user
ON CONFLICT (id) DO NOTHING;

INSERT INTO jobs (id, user_id, company, title, description, location, url, status, tags, ats_tags, resume_config)
SELECT 'job-demo-1', id, 'Acme Platform', 'Platform Engineer',
       'We are looking for a platform engineer to run our Kubernetes clusters, write Go services and keep PostgreSQL healthy. You will own what you ship and take part in the on-call rotation.',
       'Paris', '', 'saved', ARRAY[]::text[], ARRAY[]::text[],
       jsonb_build_object('selected_entity_ids', jsonb_build_array('edu-demo-1'), 'ai_rankings', '[]'::jsonb, 'profile_text', '')
FROM demo_user
ON CONFLICT (id) DO NOTHING;

COMMIT;
