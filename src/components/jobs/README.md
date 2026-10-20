# src/components/jobs

Feature components for the Job Tracker module.

## Files

| File | Description |
|------|-------------|
| `JobCard.tsx` | Clickable job card: title (two lines at most, full title on hover), company, date; same height for every card in a row. Also exports `StatusBadge` (fixed width, status → `Badge` variant from `APPLICATION_STATUS_BADGES`). |
| `JobsClient.tsx` | Jobs list: status filter (`FilterBar`, kept in the URL as `?status=`), search by title and company (kept as `?q=`, the list follows each key typed, the counts of the filter follow the search), empty states, grid of `JobCard`. |
| `JobSearch.tsx` | The search field (it opens under the filter) and, below 825 px, the magnifier that opens it; from 825 px the magnifier and Add job are segments of the status bar (focus taken in the tap, 16 px so the page does not zoom). |
| `JobForm.tsx` | Form for creating a job (`/jobs/new`), built from `Field`/`Input`/`Select`/`Textarea`; `onSave` throws to report a failure, shown in an `Alert`. |
| `JobDetailClient.tsx` | Job page: header (title, company, date, location, `StatusSelect`), then the offer and the resume as two white cards: side by side on desktop with a title strip, one at a time below desktop with `SegmentedTabs` (Offer / Resume / Cover letter, greyed out "Soon") as the top of the card, kept in `?tab=`. |
| `JobOfferEditor.tsx` | The offer, always editable (title, company, location, link, description), each field saved 0.8 s after typing via `useJobAutosave`; delete zone at the bottom. |
| `useJobAutosave.ts` | Per-field debounced save of a job; required fields are not saved empty; "Saving…" / "Saved" state. |
| `StatusSelect.tsx` | The status as a badge-coloured `SelectMenu` that opens the list of statuses. |
| `ResumeConfigPanel.tsx` | "Resume": header, the library by type, suggested skills, template, floating at the bottom, three actions of one size: **Reset to defaults** (confirmed in a `Drawer`; also clears the AI ranking), **Rank with AI** (violet), **Download PDF**. Composes `resume-config/`. |
| `useAiRanking.ts` | `useAiRanking(jobId)` — POST `/api/jobs/[id]/rank`, answered through the AI gateway (#44). |

## `resume-config/`

| File | Description |
|------|-------------|
| `logic.ts` | Pure functions: grouping and sorting (end date, custom order, AI score), toggling (an unselected entry keeps its place), moving among the selected entries, AI order, tag and description overrides, reset, and the config shown on opening (`initialConfig`). Tested in `logic.test.ts`. |
| `useResumeConfig.ts` | Loads library, config and defaults; every change is applied to the latest config and saved; text fields save 0.8 s after typing. Opening the panel never writes. The AI context is no longer edited here; its saved value is kept and still used by the ranking. |
| `ContentFields.tsx` | "Header" section: resume title and profile, with "Use my default". |
| `EntitySection.tsx` | One type of entries with its rows and editors; for experiences and projects a "Reorder" mode (with "Order by AI score") instead of arrows on every row. |
| `ReorderList.tsx` | Numbered list of the included entries with labelled Up / Down buttons. |
| `EntityRow.tsx` | Include checkbox, title, where and when, "Recommended" and match; a bordered arrow button (named "Edit the description of …" / "Choose the tags of …") opens the editor and the AI's reason. |
| `DescriptionEditor.tsx` | Description for this resume only, saved on blur; when the library keeps other versions of it (#297), a picker chooses the one the text starts from (`description_variant` in the config; choosing drops the text written for the job). |
| `SkillTagPicker.tsx` | Tags printed for a skill (toggles), add a tag to the library, AI-suggested tags. |
| `SuggestedSkills.tsx` | Skills the AI suggests adding to the library. |
