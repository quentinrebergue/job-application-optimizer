# src/schemas

Zod schemas that mirror the TypeScript types; the API routes validate request bodies with them. All schemas are barrel-exported from `index.ts`.

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export — re-exports all schemas |
| `entity.ts` | `ExperienceMetaSchema`, `ProjectMetaSchema`, `SkillMetaSchema`, `EducationMetaSchema`, `EntityMetaSchema` (discriminated union on `type`) |
| `job.ts` | `ApplicationStatusSchema`, `AIRankingSchema`, `AIAnalysisResultSchema`, `ResumeConfigSchema`, `JobOfferSchema` |
| `resume-profile.ts` | `ResumeProfileSchema` |
| `resume-generate.ts` | `GenerateResumeSchema` (body of `api/resume/generate`) |
| `resume-template.ts` | `TemplateInfoSchema`, `TemplateListSchema` (templates of the renderer service) |
