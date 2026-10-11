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
| `legal.ts` | Who runs the site (publisher, contact, host, site URL) for the legal pages and the footer, the AI provider and its settings (`AI_ON_MISTRAL`, `AI_TRAINING_OPTED_OUT`, `AI_ZERO_RETENTION`), and `ACCOUNT_TOOLS` (on since #104): flags that switch on the sentences that depend on a ticket |
| `limits.ts` | `LIMITS`: the most characters of every text a user can save (job, entries, tags, profile, resume), `LONG_TEXT_FROM` (from there a form shows a counter), `MAX_BODY_BYTES` and `MAX_ENTRIES` (how many entries of each kind: 10 experiences, 20 projects, 10 skills, 10 education, sized so a full library fits the AI prompt without cutting anything, #185). One table for the schemas, the forms and the tests (#201). |
