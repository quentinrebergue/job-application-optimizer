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
| `ResumeConfigPanel.tsx` | "Resume for this job": AI ranking, template, title/profile/AI context, the library grouped by type, AI-suggested skills, and a sticky bar with the selection count and **Download PDF**. Composes the pieces in `resume-config/`. |
| `AIRankButton.tsx` | Provider choice (Claude, Gemini) and "Rank with AI" (POST `/api/jobs/[id]/rank`). |

## `resume-config/`

| File | Description |
|------|-------------|
| `logic.ts` | Pure functions: grouping and sorting (end date, custom order, AI score), toggling, moving, AI order, tag and description overrides, reset, and the config shown on opening (`initialConfig`). Tested in `logic.test.ts`. |
| `useResumeConfig.ts` | Loads library, config and defaults; every change is applied to the latest config and saved; text fields save 0.8 s after typing. Opening the panel never writes. |
| `ContentFields.tsx` | Resume title, profile, context for the AI, with "Use my default" and AI suggestions. |
| `EntitySection.tsx` | One type of entries with its rows and editors; "Order by AI score". |
| `EntityRow.tsx` | Include checkbox, recommended badge, AI match and reason, move up/down, expand. |
| `DescriptionEditor.tsx` | Description for this resume only, saved on blur, with the AI suggestion. |
| `SkillTagPicker.tsx` | Tags printed for a skill (toggles), add a tag to the library, AI-suggested tags. |
| `SuggestedSkills.tsx` | Skills the AI suggests adding to the library. |
| `AiSuggestion.tsx` | A text proposed by the AI with a "Use this" button. |
