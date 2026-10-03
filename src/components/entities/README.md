# src/components/entities

The library: experiences, projects, skills and education, the entries every resume is built from.

## Files

| File | Description |
|------|-------------|
| `entity-fields.ts` | The fields of each kind of entry, defined once (`ENTITY_FIELDS`): a project has one "Technologies" list (also saved as its tags), a skill group its "Skills" (no level asked), experiences and degrees their "Skills & technologies" keywords. Plus `toValues`, `toPayload`, `fieldUpdate`, `missingFields`, `entityTitle`, `entitySubtitle`, `entityChips`. Pure, tested in `entity-fields.test.ts`. |
| `EntityFields.tsx` | Renders the fields of one kind from `ENTITY_FIELDS` with `Field` / `Input` / `Textarea autoGrow` / `Select`. |
| `EntityForm.tsx` | Creation form (`/entities/new`, where the kind is chosen at the top with `SegmentedTabs`): required fields checked, failure shown in an `Alert`. |
| `EntityEditor.tsx` | An entry, always editable: each field saves itself (`useFieldAutosave`); a Delete button at the bottom, confirmed in a `ConfirmDrawer`. |
| `EntityDetailClient.tsx` | Entry page: back to the library (`/resume`, on its kind), the kind as a small label above the title, "Saving…", the editor. Interview questions are kept in the data but not shown while Q&A is off (#79). |
| `LibraryPanel.tsx` | The library inside the Resume page: `FilterBar` by kind (no "All"; kept in `?tab=`), a first dashed card "Add a project"… for the current kind, then the `EntityCard`s. |
| `EntityCard.tsx` | An entry in a list (one kind at a time, so no kind badge): title (two lines at most), where and when, three tags; same height in a row. |
| `QuestionEditor.tsx` | Editor of the interview questions of an entry or a job; not shown while Q&A is off, kept for #66. |
