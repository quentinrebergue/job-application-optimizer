# src/lib/data

Data access layer — reads and writes JSON/Markdown files on disk under `/data/`. Every JSON read passes through `readJsonSafe<T>()` which validates with Zod and returns `null` on invalid data, never throws. All functions are barrel-exported from `index.ts`.

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export |
| `_utils.ts` | `readJsonSafe<T>(path, schema)` — safe Zod-validated JSON read; `readFileSafe(path)` — safe string read |
| `entities.ts` | `listEntities`, `getEntity`, `createEntity`, `updateEntity`, `deleteEntity`, `getEntityQuestions`, `saveEntityQuestions` |
| `jobs.ts` | `listJobs`, `getJob`, `createJob`, `updateJob`, `deleteJob`, `getResumeConfig`, `saveResumeConfig` |
| `exercises.ts` | `listExercises`, `getExercise`, `createExercise`, `updateExercise`, `deleteExercise` |
| `knowledge.ts` | `listKnowledge`, `getKnowledge`, `createKnowledge`, `updateKnowledge`, `deleteKnowledge` |
| `questions.ts` | `listGeneralQuestions`, `createGeneralQuestion`, `updateGeneralQuestion`, `deleteGeneralQuestion` |
