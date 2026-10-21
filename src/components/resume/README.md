# src/components/resume

The profile of the Resume page (`/resume`) and the template choice of the job page.

## Files

| File | Description |
|------|-------------|
| `ResumeDefaultsEditor.tsx` | The profile (contact details, default title and profile), each field saved by itself; every save sends the whole profile, as the API replaces it (the AI context, no longer edited, is sent back unchanged). |
| `TemplatePicker.tsx` | Template select and the options its manifest declares (colour, Small / Medium / Large for numbers, select for enums); options fixed by the app (`FIXED_TEMPLATE_OPTIONS`) are not offered, nor is the font size while "fit to page" is on (`isOptionOffered`); `effectiveOptions()` adds them for rendering. |
| `useTemplates.ts` | Loads the available templates from `/api/resume/templates`. |
