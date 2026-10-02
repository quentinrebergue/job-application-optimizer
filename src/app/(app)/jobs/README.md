# src/app/jobs

Job Application Tracker module pages.

## Files & Subdirectories

| Path | Description |
|------|-------------|
| `page.tsx` | Client component — lists all jobs with status filter tabs (All / Saved / Applied / Interview / Offer / Rejected). Grid of `JobCard` components. |
| `new/page.tsx` | Client component — `JobForm` to create a new job. POSTs to `/api/jobs` and redirects to the new job's detail page. |
| `[id]/page.tsx` | Client component — job detail view. Shows job meta, a clickable status pipeline for quick transitions, and the `ResumeConfigPanel` (entity selection, AI ranking, PDF generation). Supports inline editing and delete. |
