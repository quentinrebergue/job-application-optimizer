# src/lib/ai

AI ranking of the library against a job offer (used by `api/jobs/[id]/rank`). Everything goes through the AI gateway (`services/ai-gateway`, OVHcloud AI Endpoints, #44): no provider, no API key in the app. Configured by `AI_GATEWAY_URL`.

## Files

| File | Description |
|------|-------------|
| `gateway.ts` | `askGateway()`: one call to `POST /v1/complete` of the gateway; `AiGatewayError` carries the HTTP status and a message the user can read |
| `index.ts` | `rankJobWithAI(userId, …)`: builds the prompt, asks the gateway, shapes the result; `rankWithUsage` also returns the tokens and what the AI got wrong |
| `ranking-prompt.ts` | `buildRankingPrompt` (entries get short labels E1, P3, S2), `normalizeRanking` (the answer is untrusted: unknown labels dropped, the code chooses what is recommended) |

The AI rates every experience, project and skill (level 0 to 3) and lists them best first; `src/config/ranking.ts` holds how many are recommended per type. Education is not rated. Nothing about the candidate's name or contact details is in the prompt.
