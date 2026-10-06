# src/config

Application-wide configuration. All values are barrel-exported from `index.ts`.

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export |
| `constants.ts` | `APPLICATION_STATUSES`, status labels and badge variants (`APPLICATION_STATUS_BADGES`) |
| `entity-types.ts` | `ENTITY_TYPE_CONFIGS` array (id, label, plural, icon per type), `ENTITY_TYPE_IDS`, `getEntityTypeConfig(id)` helper |
| `sections.ts` | `SECTIONS`: the app's sections in the top bar (Jobs, Resume), with the extra URL prefixes that mark them active |
| `resume.ts` | `FIXED_TEMPLATE_OPTIONS` — template options the app sets itself (date placement on the right), applied to the templates that declare them and not offered in the picker |
