# src/components/entities

The library: experiences, projects, skills and education, the entries every resume is built from.

## Files

| File | Description |
|------|-------------|
| `entity-fields.ts` | The fields of each kind of entry, defined once (`ENTITY_FIELDS`): a project has one "Technologies" list (also saved as its tags), a skill group its "Skills" (no level asked), experiences and degrees their "Skills & technologies" keywords. Plus `toValues`, `toPayload`, `fieldUpdate`, `missingFields`, `entityTitle`, `entitySubtitle`, `entityChips`. Pure, tested in `entity-fields.test.ts`. |
| `EntityFields.tsx` | Renders the fields of one kind from `ENTITY_FIELDS` with `Field` / `Input` / `Textarea autoGrow` / `Select`. |
| `EntityForm.tsx` | Creation form (the kind is chosen at the top of `NewEntryDialog` with `SegmentedTabs`): required fields checked, failure shown in an `Alert`. |
| `EntityEditor.tsx` | An entry, always editable: each field saves itself (`useFieldAutosave`, which also saves what was typed in the last 0.8 s when the dialog is closed); a Delete button at the bottom that asks first, in place (a drawer on top of a dialog would be hidden behind it). |
| `EntryDialog.tsx` | An entry in a dialog (a drawer on a phone, `ResponsiveDialog`): the editor, "Saving…", the deletion. |
| `NewEntryDialog.tsx` | A new entry in a dialog: the kind at the top, the creation form. The four forms are laid one over the other and only the chosen one is seen, so the dialog has the same height for every kind. |
| `LibraryPanel.tsx` | The library inside the Resume page: `FilterBar` by kind (no "All"), a first dashed card "Add a project"… for the current kind, then the `EntityCard`s. The kind, the entry open and the entry being created are in the address (`?tab=`, `?entry=`, `?new=`), changed with the History API: Next.js follows it without asking the server for the page again, so a click opens at once; the back button closes a dialog and an address with `?entry=` opens it. What changed in a dialog is shown at once and the page is refreshed behind. |
| `ImportResume.tsx` | Import a resume (#110, #268): a button and its dialog (`Modal`). The user picks a PDF (checked before it is sent: PDF, not empty, 2 MB), it is sent as the body of `POST /api/import/resume`, and the dialog says what was added and what was not and why (duplicates, a full library, items left out, a PDF read in part), or the message of the failure with "Try again". The entries go straight into the library; the page is refreshed when the dialog is closed. Shown in the Library header of the Resume page. The logic is in `src/lib/import-resume.ts`. |
| `EntityCard.tsx` | An entry in a list (one kind at a time, so no kind badge): title (two lines at most), where and when, three tags; same height in a row. A plain link to the library with its dialog open: a click opens the dialog, a new tab or a copied link goes there. |
