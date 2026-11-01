# db

Legacy scripts of the first deployment, on a single server (see `ansible/playbook.yml`). The schema is now owned by the versioned migrations of `services/db-migrator/`, run as a Kubernetes Job; nothing here runs in production any more.

| File | Description |
|---|---|
| `migrate-jobs.mjs`, `migrate-entities.mjs` | Moved the first JSON data files of jobs and library entries into PostgreSQL |
| `migrate-taxonomy.mjs`, `migrate-questions.mjs`, `migrate-knowledge-exercises.mjs`, `migrate-cover-letter.mjs` | The same for the modules that were removed from the app later |
