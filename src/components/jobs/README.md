# src/components/jobs

Feature components for the Job Tracker module.

## Files

| File | Description |
|------|-------------|
| `JobCard.tsx` | Clickable job card (`cardClasses`) with title, company, location, status badge and date. Also exports `StatusBadge` (status → `Badge` variant from `APPLICATION_STATUS_BADGES`). |
| `JobsClient.tsx` | Jobs list: status filter (`Tabs`, kept in the URL as `?status=`), empty state per filter, grid of `JobCard`. |
| `JobForm.tsx` | Form for creating a job (`/jobs/new`), built from `Field`/`Input`/`Select`/`Textarea`; `onSave` throws to report a failure, shown in an `Alert`. |
| `JobDetailClient.tsx` | Job page: header (title, company, date, location, `StatusSelect`), then the offer and the resume as two white cards: side by side on desktop with a title strip, one at a time below desktop with `SegmentedTabs` (Offer / Resume / Cover letter · Soon, `FEATURES.coverLetter`) as the top of the card, kept in `?tab=`. |
| `JobOfferEditor.tsx` | The offer, always editable (title, company, location, link, description), each field saved 0.8 s after typing via `useJobAutosave`; delete zone at the bottom. |
| `useJobAutosave.ts` | Per-field debounced save of a job; required fields are not saved empty; "Saving…" / "Saved" state. |
| `StatusSelect.tsx` | The status as a badge-coloured `SelectMenu` that opens the list of statuses. |
| `ResumeConfigPanel.tsx` | "Resume" in three steps: 1 Tailor with AI (rank, clear), 2 Content (header, library by type, suggested skills), 3 Template; a sticky bar with the selection count and **Download PDF**. Composes `resume-config/`. |
| `AIRankButton.tsx` | "Rank with AI" (POST `/api/jobs/[id]/rank`); one provider, moving to OVH AI Endpoints with #44. |

## `resume-config/`

| File | Description |
|------|-------------|
| `logic.ts` | Pure functions: grouping and sorting (end date, custom order, AI score), toggling, moving, AI order, tag and description overrides, reset, and the config shown on opening (`initialConfig`). Tested in `logic.test.ts`. |
| `useResumeConfig.ts` | Loads library, config and defaults; every change is applied to the latest config and saved; text fields save 0.8 s after typing. Opening the panel never writes. The AI context is no longer edited here; its saved value is kept and still used by the ranking. |
| `ContentFields.tsx` | "Header" section: resume title and profile, with "Use my default". |
| `EntitySection.tsx` | One type of entries with its rows and editors; "Order by AI score". |
| `EntityRow.tsx` | Include checkbox, recommended badge, AI match and reason, move up/down, expand. |
| `DescriptionEditor.tsx` | Description for this resume only, saved on blur. |
| `SkillTagPicker.tsx` | Tags printed for a skill (toggles), add a tag to the library, AI-suggested tags. |
| `SuggestedSkills.tsx` | Skills the AI suggests adding to the library. |
