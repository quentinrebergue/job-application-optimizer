# src/components/jobs

Feature components for the Job Tracker module.

## Files

| File | Description |
|------|-------------|
| `JobCard.tsx` | Clickable job card (`cardClasses`) with title, company, location, status badge and date. Also exports `StatusBadge` (status → `Badge` variant from `APPLICATION_STATUS_BADGES`). |
| `JobForm.tsx` | Controlled form for creating or editing a job (title, company, URL, status, description). |
| `ResumeConfigPanel.tsx` | Full resume configuration panel for a specific job: entity checkbox list sorted by AI relevance score, AI Rank button (POST `/api/ai/rank`), and Generate PDF button (POST `/api/resume/generate`). Auto-saves selection changes. |
