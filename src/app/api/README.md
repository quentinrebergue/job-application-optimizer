# src/app/api

Next.js API route handlers. All routes return JSON, need a signed-in user, and only see that user's data. Request bodies are validated with Zod.

## Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `entities/` | GET, POST | List the library entries (optional `?type=` filter); create an entry |
| `entities/[type]/[id]/` | GET, PUT, DELETE | Get, update, or delete one entry |
| `jobs/` | GET, POST | List jobs; create a job |
| `jobs/[id]/` | GET, PUT, DELETE | Get, update, or delete one job |
| `jobs/[id]/resume-config/` | GET, PUT | Get or save the job's resume settings (selected entries, order, texts) |
| `jobs/[id]/rank/` | GET, POST, DELETE | Read, run, or clear the AI ranking of the library for the job |
| `resume/generate/` | POST | Build a payload from the user's profile and entries and render a PDF through the resume-renderer service. Body: `{ jobId?, entityIds?, template?, options? }` |
| `resume/templates/` | GET | List the templates (and their option schemas) offered by the renderer service |
| `resume/defaults/` | GET, PUT | Read or write the user's resume profile (name, contact, default title and profile) |
