# src/hooks

Client hooks shared by several features.

| File | Description |
|------|-------------|
| `useFieldAutosave.ts` | Fields that save themselves 0.8 s after typing, one request per field; `validate` blocks a value (e.g. a required field left empty); `state` is idle / saving / saved / error. Used by library entries and the profile. |
