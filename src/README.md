# src

Root source directory for the Next.js application.

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `app/` | Next.js App Router — pages, layouts, and API routes |
| `components/` | Reusable React components (UI primitives, feature components) |
| `config/` | Application-wide constants, entity type registry, sections of the top bar |
| `emails/` | Mails as React Email components (`EmailLayout`, `VerifyEmail`), their brand values (`theme.ts`, checked against `globals.css`) and `messages.tsx`, which renders them to HTML and plain text for `lib/email` |
| `hooks/` | Client hooks shared by several features |
| `tests/` | Tests of the repository itself (the rules of the code, the manifests, the READMEs) and the database test setup |
| `lib/` | Server-side business logic — data access, resume rendering, AI ranking |
| `schemas/` | Zod validation schemas mirroring each TypeScript type |
| `types/` | TypeScript type definitions for the entire application |

## Files

| File | Description |
|------|-------------|
| `proxy.ts` | Runs before every request: the Content Security Policy with its nonce, the check of the origin of API requests, the redirects of signed-out visitors. |
| `instrumentation.ts` | Runs once when the Node.js server starts (a Next.js convention): starts the cleanup of expired data (`lib/maintenance.ts`, #213). |
