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
| `cn.ts` | `cn()` — joins class names (clsx + tailwind-merge aware of the design tokens). Client-safe. |
| `format.ts` | `formatDate(iso, style)` — dates in UTC so server and browser render the same text. Client-safe. |
| `http.ts` | `fetchJson(url, { json })` — client fetch that throws `HttpError` (with the server's message) when the response is not ok. |
| `entity-filter.ts` | `LIBRARY_TABS` (no "All"), `parseLibraryTab()` (defaults to experiences), `parseEntityType()`, `libraryHref()` — the `?tab=` / `?type=` of the library in `/resume`. |
| `job-filter.ts` | `parseStatusFilter()` — the `?status=` filter of `/jobs`; `parseJobTab()` — the `?tab=` of a job page. |
