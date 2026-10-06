# src

Root source directory for the Next.js application.

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `app/` | Next.js App Router — pages, layouts, and API routes |
| `components/` | Reusable React components (UI primitives, feature components) |
| `config/` | Application-wide constants, entity type registry, sections of the top bar |
| `emails/` | Mails as React Email components (`EmailLayout`, `VerifyEmail`), their brand values (`theme.ts`, checked against `globals.css`) and `messages.tsx`, which renders them to HTML and plain text for `lib/email` |
| `lib/` | Server-side business logic — data access, resume rendering, AI ranking |
| `schemas/` | Zod validation schemas mirroring each TypeScript type |
| `types/` | TypeScript type definitions for the entire application |
