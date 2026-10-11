# src/app/api

Next.js API route handlers. All routes return JSON, need a signed-in user, and only see that user's data (except the two probes `healthz/` and `livez/`, and `csp-report/`). Request bodies are validated with Zod. A request that changes data (POST, PUT, PATCH, DELETE) must come from our own pages, checked in `src/proxy.ts` (403 `bad_origin`, #206), and its body must be JSON (415 otherwise).

## Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `healthz/` | GET | Public. 200 when the database answers, 503 otherwise. Readiness probe and external uptime check |
| `csp-report/` | POST | Public, answers 204 whatever it gets. Where the browsers report what the Content Security Policy blocked: one short line in the log (no query, 5 reports at most, 30 requests a minute per address, 8 KB), nothing stored (#205) |
| `livez/` | GET | Public. 200 while the process answers, no dependency. Liveness probe |
| `entities/` | GET, POST | List the library entries (optional `?type=` filter); create an entry |
| `entities/[type]/[id]/` | GET, PUT, DELETE | Get, update, or delete one entry |
| `jobs/` | GET, POST | List jobs; create a job |
| `jobs/[id]/` | GET, PUT, DELETE | Get, update, or delete one job |
| `jobs/[id]/resume-config/` | GET, PUT | Get or save the job's resume settings (selected entries, order, texts) |
| `jobs/[id]/rank/` | GET, POST, DELETE | Read, run, or clear the AI ranking of the library for the job |
| `resume/generate/` | POST | Build a payload from the user's profile and entries and render a PDF through the resume-renderer service. Body: `{ jobId?, entityIds?, template?, options? }` |
| `resume/templates/` | GET | List the templates (and their option schemas) offered by the renderer service |
| `resume/defaults/` | GET, PUT | Read or write the user's resume profile (name, contact, default title and profile) |
