# src/components/entities

The library: experiences, projects, skills and education, the entries every resume is built from.

## Files

| File | Description |
|------|-------------|
| `entity-fields.ts` | The fields of each kind of entry, defined once (`ENTITY_FIELDS`): a project has one "Technologies" list (also saved as its tags), a skill group its "Skills" (no level asked), experiences and degrees their "Skills & technologies" keywords. Plus `toValues`, `toPayload`, `fieldUpdate`, `missingFields`, `entityTitle`, `entitySubtitle`, `entityChips`. Pure, tested in `entity-fields.test.ts`. |
| `EntityFields.tsx` | Renders the fields of one kind from `ENTITY_FIELDS` with `Field` / `Input` / `Textarea autoGrow` / `Select`. |
| `EntityForm.tsx` | Creation form (`/entities/new`, where the kind is chosen at the top with `SegmentedTabs`): required fields checked, failure shown in an `Alert`. |
| `EntityEditor.tsx` | An entry, always editable: each field saves itself (`useFieldAutosave`); a Delete button at the bottom, confirmed in a `ConfirmDrawer`. |
| `EntityDetailClient.tsx` | Entry page: back to the library (`/resume`, on its kind), the kind as a small label above the title, "Saving…", the editor. |
| `LibraryPanel.tsx` | The library inside the Resume page: `FilterBar` by kind (no "All"; kept in `?tab=`), a first dashed card "Add a project"… for the current kind, then the `EntityCard`s. |
| `ImportResume.tsx` | Import a resume (#110, #268): a button and its dialog (`Modal`). The user picks a PDF (checked before it is sent: PDF, not empty, 2 MB), it is sent as the body of `POST /api/import/resume`, and the dialog says what was added and what was not and why (duplicates, a full library, items left out, a PDF read in part), or the message of the failure with "Try again". The entries go straight into the library; the page is refreshed when the dialog is closed. Shown in the Library header of the Resume page. The logic is in `src/lib/import-resume.ts`. |
| `EntityCard.tsx` | An entry in a list (one kind at a time, so no kind badge): title (two lines at most), where and when, three tags; same height in a row. |
