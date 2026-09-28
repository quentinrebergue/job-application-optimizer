# src/components/resume

Resume builder feature components.

## Files

| File | Description |
|------|-------------|
| `GeneratePdfButton.tsx` | Client button that POSTs to `/api/resume/generate` with a list of entity IDs and reports the result. |
| `SectionTemplateEditor.tsx` | Accordion panel for editing a section's two-level LaTeX templates. Has two tabs: "Section wrapper" (edits `data/resume/sections/{type}.tex` via `/api/resume/sections/[type]`) and "Entity template" (edits `data/resume/entity-templates/{type}.tex` via `/api/resume/entity-templates/[type]`). Shows amber dot indicator for unsaved changes per tab. |
