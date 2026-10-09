# src/lib

Server-side business logic. All functions are barrel-exported from `index.ts`. Three sub-libraries: data access, resume rendering, and AI ranking.

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `data/` | Data access on Postgres, scoped to the signed-in user |
| `auth/` | Sessions, password hashing, email confirmation (`email-verification.ts`) and password reset (`password-reset.ts`) |
| `email/` | `sendEmail()` over SMTP through an ordered list of providers (primary, optional fallback); mails printed in the console in development |
| `resume/` | Builds the render payload from entities and the user profile, and calls the resume-renderer service (Go + Typst) |
| `ai/` | AI ranking of the library against a job offer |

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export — re-exports `data` and `ai` modules |
| `cn.ts` | `cn()` — joins class names (clsx + tailwind-merge aware of the design tokens). Client-safe. |
| `format.ts` | `formatDate(iso, style)` — dates in UTC so server and browser render the same text. Client-safe. |
| `http.ts` | `fetchJson(url, { json })` — client fetch that throws `HttpError` (with the server's message) when the response is not ok. |
| `entity-filter.ts` | `LIBRARY_TABS` (no "All"), `parseLibraryTab()` (defaults to experiences), `parseEntityType()`, `libraryHref()` — the `?tab=` / `?type=` of the library in `/resume`. |
| `rate-limit.ts` | `consumeRateLimit(key, limit, windowMs)` — fixed-window counters in the `rate_limits` table (Redis later, #141); `clientIp(headers)`, `isPublicIp(ip)` (private addresses are not limited: they are the load balancer, shared by everyone). |
| `text-limit.ts` | `tooLong(value, max)`, `counterFor(value, max)`, `isLongText(max)`: what a form shows about the size of a text (#201). Client-safe. |
| `validation/read-json.ts` | `readJson(request, schema, maxBytes)`: reads a JSON body without going over `maxBytes` (413 `body_too_large`), then checks it (400 naming the field and its limit). Used by every route that takes a body. |
| `job-filter.ts` | `parseStatusFilter()` — the `?status=` filter of `/jobs`; `parseJobTab()` — the `?tab=` of a job page. |
