# src/app

Next.js App Router root. Contains the document layout, two route groups (their names are not part of the URL) and all API routes.

## Files

| File | Description |
|------|-------------|
| `layout.tsx` | Root layout — `<html>`, `<body>` and fonts only, no navigation. |
| `(app)/layout.tsx` | Shell of the signed-in app: one top bar (`AppHeader`) at every width. |
| `(app)/page.tsx` | Home page: a card per section (Jobs, Resume) with real counts. |
| `(public)/layout.tsx` | Shell of the pages before sign-in (`login/`, `signup/`): wordmark only, no app navigation. |
| `globals.css` | Global styles — imports Tailwind CSS v4 with `@import "tailwindcss"`. |

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `(app)/resume/` | Resume page: the profile and the library (`?tab=` kind) |
| `(app)/entities/` | Entry page and new entry; `/entities` and `/entities/[type]` redirect to the library in `/resume` |
| `(app)/jobs/` | Job Application Tracker pages |
| `(app)/ui/` | Catalogue of the UI components (for development) |
| `(public)/login/`, `(public)/signup/` | Sign-in and sign-up pages |
| `api/` | Next.js API route handlers (server-side, JSON responses) |
