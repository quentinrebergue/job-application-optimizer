# src/app

Next.js App Router root. Contains the global layout, the dashboard home page, feature route groups, and all API routes.

## Files

| File | Description |
|------|-------------|
| `layout.tsx` | Root layout — wraps every page with `<Sidebar>` + `<main>`. Applies global Tailwind styles. |
| `page.tsx` | Dashboard home page — shows module cards from `MODULE_CONFIGS`. |
| `globals.css` | Global styles — imports Tailwind CSS v4 with `@import "tailwindcss"`. |

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `resume/` | Resume Builder pages |
| `entities/` | Entity Library pages (CRUD for experiences/projects/skills) |
| `jobs/` | Job Application Tracker pages |
| `qa/` | Q&A Flashcard Trainer pages |
| `coding/` | Coding Interview Trainer pages |
| `api/` | Next.js API route handlers (server-side, JSON responses) |
