# src/app/entities

Entity Library — browse, create, and edit resume entities (experiences, projects, skills).

## Files & Subdirectories

| Path | Description |
|------|-------------|
| `page.tsx` | Client component — lists all entities with tab filter (All / Experiences / Projects / Skills). Links to create and detail pages. |
| `new/page.tsx` | Client component — two-step form: (1) select entity type, (2) fill EntityForm. POSTs to `/api/entities` and redirects to the new entity's detail page. |
| `[type]/[id]/page.tsx` | Client component — entity detail view. Shows meta fields, inline edit via EntityForm, Q&A question editor, and delete button. Uses `useParams()` for `type` and `id`. |
