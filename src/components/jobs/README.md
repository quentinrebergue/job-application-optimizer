# src/components/jobs

Feature components for the Job Tracker module.

## Files

| File | Description |
|------|-------------|
| `JobCard.tsx` | Clickable job card (`cardClasses`) with title, company, location, status badge and date. Also exports `StatusBadge` (status → `Badge` variant from `APPLICATION_STATUS_BADGES`). |
| `JobsClient.tsx` | Jobs list: status filter (`Tabs`, kept in the URL as `?status=`), empty state per filter, grid of `JobCard`. |
| `JobForm.tsx` | Form for creating or editing a job, built from `Field`/`Input`/`Select`/`Textarea`; `onSave` throws to report a failure, shown in an `Alert`. |
| `JobDetailClient.tsx` | Job page: header actions (edit, delete), `JobMeta` or `JobForm`, then `Disclosure` sections (resume open by default, cover letter, interview Q&A). Every write goes through `fetchJson`; failures are shown and leave the page as it was. |
| `JobMeta.tsx` | Read-only job view: status selector (`Tabs`, `aria-pressed`), dates in UTC, offer link, description. |
| `ResumeConfigPanel.tsx` | Full resume configuration panel for a specific job: entity checkbox list sorted by AI relevance score, AI Rank button (POST `/api/ai/rank`), and Generate PDF button (POST `/api/resume/generate`). Auto-saves selection changes. |
