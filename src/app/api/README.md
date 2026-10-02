# src/app/api

Next.js API route handlers. All routes return JSON. All reads are validated with Zod via `readJsonSafe` — malformed data returns a 404/500 rather than crashing.

## Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `entities/` | GET, POST | List all entities (optional `?type=` filter); create entity |
| `entities/[type]/[id]/` | GET, PUT, DELETE | Get, update, or delete a single entity |
| `jobs/` | GET, POST | List all jobs; create job |
| `jobs/[id]/` | GET, PUT, DELETE | Get, update, or delete a single job |
| `jobs/[id]/resume-config/` | GET, PUT | Get or save the resume config (selected entities + AI rankings) for a job |
| `exercises/` | GET, POST | List exercise metadata; create exercise |
| `exercises/[id]/` | GET, PUT, DELETE | Get, update, or delete a single exercise (includes description + solution files) |
| `knowledge/` | GET, POST | List knowledge items; create item |
| `knowledge/[id]/` | GET, PUT, DELETE | Get, update, or delete a knowledge item (includes explanation.md) |
| `questions/` | GET, POST | List general Q&A questions; create question |
| `questions/[id]/` | PUT, DELETE | Update or delete a general question |
| `resume/generate/` | POST | Build a payload from the user's profile and entities and render a PDF through the resume-renderer service. Body: `{ jobId?, entityIds?, template?, options? }` |
| `resume/templates/` | GET | List the templates (and their option schemas) offered by the renderer service |
| `resume/defaults/` | GET, PUT | Read or write the signed-in user's resume profile (name, contact, default title/profile, AI context) |
| `ai/rank/` | POST | Call OpenAI to rank entities for a job, save to `resume-config.json`. Body: `{ jobId }`. Requires `OPENAI_API_KEY`. |
| `ai/reconcile-tags/` | POST | Call OpenAI to reconcile free-form tags against the taxonomy tree. Body: `{ tags }`. Requires `OPENAI_API_KEY`. |
| `taxonomy/` | GET | Return the full taxonomy tree from `data/taxonomy/tree.json` |
| `taxonomy/[id]/` | PUT, DELETE | Update or delete a taxonomy node (DELETE supports `?cascade=true`) |
| `taxonomy/[id]/aliases/` | POST, DELETE | Add or remove an alias from a node |
