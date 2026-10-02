# src/components/resume

Resume builder feature components.

## Files

| File | Description |
|------|-------------|
| `GeneratePdfButton.tsx` | Client button that POSTs to `/api/resume/generate` with a list of entity IDs and reports the result. |
| `TemplatePicker.tsx` | Controlled template select with controls generated from the template's option schema (slider, colour, enum). |
| `useTemplates.ts` | Hook that loads the available templates from `/api/resume/templates`. |
