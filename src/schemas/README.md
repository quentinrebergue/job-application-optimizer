# src/schemas

Zod validation schemas that mirror each TypeScript type. Used by the data access layer to validate every JSON file read from disk — malformed files return `null` instead of crashing. All schemas are barrel-exported from `index.ts`.

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export — re-exports all schemas |
| `entity.ts` | `EntityQuestionSchema`, `ExperienceMetaSchema`, `ProjectMetaSchema`, `SkillMetaSchema`, `EntityMetaSchema` (discriminated union on `type`) |
| `job.ts` | `ApplicationStatusSchema`, `AIRankingSchema`, `ResumeConfigSchema`, `JobOfferSchema` |
| `exercise.ts` | `ExerciseMetaSchema` |
| `knowledge.ts` | `KnowledgeMetaSchema` |
| `general-question.ts` | `GeneralQuestionSchema` |
