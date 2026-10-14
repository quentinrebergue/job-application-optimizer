# src/app

Next.js App Router root. Contains the document layout, two route groups (their names are not part of the URL) and all API routes.

## Files

| File | Description |
|------|-------------|
| `layout.tsx` | Root layout — `<html>`, `<body>` and fonts only, no navigation. |
| `not-found.tsx`, `error.tsx` | An address that matches no page, and a failure outside the app shell: the name, a message and a way back (#78). |
| `(app)/not-found.tsx`, `(app)/error.tsx`, `(app)/loading.tsx` | The same inside the app's bar: an unknown job or entry, a page that failed (with "Try again"), and the wait while a page loads. |
| `(app)/layout.tsx` | Shell of the signed-in app: one top bar (`AppHeader`) at every width. |
| `(app)/page.tsx` | Home page: a card per section (Jobs, Resume) with real counts. |
| `(public)/layout.tsx` | Shell of the pages before sign-in (`login/`, `signup/`): wordmark only, no app navigation. |
| `globals.css` | Global styles — imports Tailwind CSS v4 with `@import "tailwindcss"`. |

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `(app)/resume/` | Resume page: the profile and the library (`?tab=` kind) |
| `(app)/entities/` | Old addresses only: `/entities`, `/entities/[type]`, `/entities/[type]/[id]` and `/entities/new` all redirect to the library in `/resume` (an entry opens and is made in a dialog there, `?entry=` and `?new=`) |
| `(app)/jobs/` | Job Application Tracker pages |
| `(app)/account/` | The account page: password, email address, data export and account deletion (#104, #236) |
| `(app)/ui/` | Catalogue of the UI components (for development) |
| `(public)/login/`, `(public)/signup/` | Sign-in and sign-up pages |
| `api/` | Next.js API route handlers (server-side, JSON responses) |
