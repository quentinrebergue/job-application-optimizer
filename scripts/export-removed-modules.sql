-- Everything that migration 016 drops (#113), as one JSON document on the standard output.
-- Run it BEFORE the migration reaches production (the db-migrator runs at each Argo CD sync):
--
--   kubectl -n job-optimizer exec -i statefulset/postgres -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA' \
--     < scripts/export-removed-modules.sql > removed-modules-$(date +%F).json
--
-- The file holds the content of users: keep it outside the repository (removed-modules-*.json is git-ignored).
SELECT json_build_object(
  'exported_at', now(),
  'taxonomy', (SELECT coalesce(json_agg(t), '[]'::json) FROM taxonomy t),
  'general_questions', (SELECT coalesce(json_agg(t), '[]'::json) FROM general_questions t),
  'knowledge', (SELECT coalesce(json_agg(t), '[]'::json) FROM knowledge t),
  'exercises', (SELECT coalesce(json_agg(t), '[]'::json) FROM exercises t),
  'cover_letter_sentences', (SELECT coalesce(json_agg(t), '[]'::json) FROM cover_letter_sentences t),
  'jobs_columns', (SELECT coalesce(json_agg(json_build_object('id', id, 'user_id', user_id, 'questions', questions, 'cover_letter', cover_letter)), '[]'::json) FROM jobs),
  'entities_columns', (SELECT coalesce(json_agg(json_build_object('id', id, 'user_id', user_id, 'questions', questions)), '[]'::json) FROM entities)
);
