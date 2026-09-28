# src/lib

Server-side business logic. All functions are barrel-exported from `index.ts`. Three sub-libraries: data access, LaTeX generation, and AI ranking.

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `data/` | Read/write JSON and Markdown files in the `/data/` directory with Zod validation |
| `latex/` | LaTeX template loading, entity injection, and PDF compilation via `pdflatex` |
| `ai/` | OpenAI-powered entity ranking for job-specific resume tailoring |

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export — re-exports `data`, `latex`, and `ai` modules |
