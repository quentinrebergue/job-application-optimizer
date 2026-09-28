# src/lib/ai

AI-powered entity ranking for job-specific resume tailoring. Makes a single OpenAI API call (gpt-4o-mini) to score each entity against a job description, then caches the result in `data/jobs/{jobId}/resume-config.json`.

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export |
| `ranker.ts` | `rankEntities(jobDescription, entities)` — calls OpenAI, returns `AIRanking[]` sorted by score descending |

## Requirements

Set `OPENAI_API_KEY` in `.env.local`. Without it, the `/api/ai/rank` route will return a 500 error.
