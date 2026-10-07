# src/lib/data

Data access layer on Postgres (`@/lib/db`). Every query is scoped to the signed-in user (`user_id`). All functions are barrel-exported from `index.ts` (except `users.ts`, used by auth).

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export |
| `entities.ts` | `listEntities`, `getEntity`, `createEntity`, `updateEntity`, `deleteEntity` |
| `jobs.ts` | `listJobs`, `getJob`, `createJob`, `updateJob`, `deleteJob`, `getResumeConfig`, `saveResumeConfig` |
| `resume-profile.ts` | `getResumeProfile`, `saveResumeProfile` |
| `users.ts` | `createUser`, `findUserByEmail`, `findUserById`, `markEmailVerified`, `updatePassword` |
| `email-tokens.ts` | Single-use tokens sent by mail (only their SHA-256 is stored): `createEmailToken`, `consumeEmailToken`, `peekEmailToken` (check without using), `invalidateEmailTokens`, `countRecentTokens` |
