# src/types

TypeScript type definitions for the entire application. All types are barrel-exported from `index.ts`.

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export — re-exports all types from this directory |
| `entity.ts` | `EntityType`, `EntityQuestion`, `ExperienceMeta`, `ProjectMeta`, `SkillMeta`, `EntityMeta` (union), `Entity` (union with questions) |
| `job.ts` | `ApplicationStatus`, `AIRanking`, `ResumeConfig`, `JobOffer`, `JobWithConfig` |
| `qa.ts` | `GeneralQuestion`, `CardState`, `TestScope`, `TestConfig`, `TestCard`, `TestSession` |
| `coding.ts` | `Difficulty`, `KnowledgeMeta`, `KnowledgeItem`, `ExerciseMeta`, `Exercise`, `CodingTestSession` |
