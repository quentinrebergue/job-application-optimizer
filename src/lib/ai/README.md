# src/lib/ai

AI ranking of the library against a job offer (used by `api/jobs/[id]/rank`). To be replaced by the AI gateway service on OVHcloud AI Endpoints (#44).

## Files

| File | Description |
|------|-------------|
| `index.ts` | `rankJobWithAI(provider, …)`: dispatches to a provider; `AIProvider`, `isAIProvider` |
| `ranking-prompt.ts` | `buildRankingPrompt`, `parseRankingResponse`: the same prompt and parsing for every provider |
| `claude.ts`, `gemini.ts` | One call per provider |
