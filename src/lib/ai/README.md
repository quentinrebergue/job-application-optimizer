# src/lib/ai

AI ranking of the library against a job offer (used by `api/jobs/[id]/rank`). Everything goes through the AI gateway (`services/ai-gateway`, OVHcloud AI Endpoints, #44): no provider, no API key in the app. Configured by `AI_GATEWAY_URL`.

## Files

| File | Description |
|------|-------------|
| `gateway.ts` | `askGateway()`: one call to `POST /v1/complete` of the gateway; `AiGatewayError` carries the HTTP status and a message the user can read |
| `index.ts` | `rankJobWithAI(userId, …)`: builds the prompt, asks the gateway, shapes the result |
| `ranking-prompt.ts` | `buildRankingPrompt`, `normalizeRanking`: the prompt and the output contract |
