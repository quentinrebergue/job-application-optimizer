# src/lib

Server-side business logic. All functions are barrel-exported from `index.ts`. Three sub-libraries: data access, resume rendering, and AI ranking.

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `data/` | Read/write JSON and Markdown files in the `/data/` directory with Zod validation |
| `resume/` | Builds the render payload from entities and the user profile, and calls the resume-renderer service (Go + Typst) |
| `ai/` | OpenAI-powered entity ranking for job-specific resume tailoring |

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export — re-exports `data` and `ai` modules |
