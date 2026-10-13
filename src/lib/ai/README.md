# src/lib/ai

AI ranking of the library against a job offer (used by `api/jobs/[id]/rank`). Everything goes through the AI gateway (`services/ai-gateway`, OVHcloud AI Endpoints, #44): no provider, no API key in the app. Configured by `AI_GATEWAY_URL`. Provider: Mistral AI (the gateway's `AI_BASE_URL` and `AI_MODEL`).

## Files

| File | Description |
|------|-------------|
| `gateway.ts` | `askGateway()`: one call to `POST /v1/complete` of the gateway; `AiGatewayError` carries the HTTP status, the gateway's reason `code` and a message the user can read |
| `index.ts` | `rankJobWithAI(userId, …)`: builds the prompt, asks the gateway, shapes the result; `rankWithUsage` also returns the tokens and what the AI got wrong |
| `limits.ts` | `aiLimits()`: per user 10 rankings an hour, 20 a day, 50 a week, and 3 EUR a month for the whole site, from `AI_PER_HOUR`, `AI_PER_DAY`, `AI_PER_WEEK`, `AI_MONTHLY_CAP_EUR` (a bad value falls back to the default); `AI_MAX_PROMPT_CHARS` and `AI_MAX_OUTPUT_TOKENS` mirror the gateway's limits |
| `usage.ts` | The accounting (#203): `reserveAiCall(userId, feature)` checks the limits and writes the call to `ai_usage` at its worst-case cost (at the price of the model that answered last, the dearest known one before any call), in one transaction under a lock (calls at the same time cannot all pass); `settleAiCall` writes the real tokens and cost, a failure (the prompt only after a timeout) or removes a call that never reached the AI. Denials: 429 `ai_user_limit` with the wait, 503 `ai_monthly_cap`. A warning is logged once at 80 % of the cap |
| `failure.ts` | `outcomeOfFailure(error)`: how a failed ranking is counted. A timeout, an unusable answer or an error of ours counts; the kill switch, a provider outage, a refused request or an unreachable gateway do not (the user does not use up their hour on errors) |
| `prices.ts` | `PRICES` (EUR per million tokens, dated; Mistral has no endpoint for them), `costOf`, `priceOf`, and the dearest price, used for a model not in the table. The evaluation tool reads the same table |
| `prompt-size.ts` | `checkPromptSize(...)` (#185): the size of the request as the gateway counts it, checked against `AI_MAX_PROMPT_CHARS` (60,000) before anything is reserved; over it, a message with the sizes of the library and the offer and the three longest entries |
| `import-prompt.ts` | The import of a resume (#267, `api/import/resume`): `buildImportPrompt` (the text of a PDF is data, between `<resume>` tags it cannot close, one numbered line after the other), `IMPORT_SCHEMA` (what the model may write: the fields copied from the text, and the numbers of the first and last line of a description, never a description), `parseImportAnswer` (the answer is checked against the text: a title, company, degree or name the text does not hold drops the entry, a place, period or keyword it does not hold is removed, a description is read back from the lines pointed at; then the schemas of the forms. Nothing is repaired by guessing). An import is one call of the feature `import`: the gateway caps its answer at `MAX_OUTPUT_TOKENS_IMPORT` (4,000, more than needed now that no description is written: to lower once measured) and the app prices it at `AI_MAX_OUTPUT_TOKENS_IMPORT`: change them together |
| `ranking-prompt.ts` | `buildRankingPrompt` (entries get short labels E1, P3, S2), `normalizeRanking` (the answer is untrusted: unknown labels dropped, the code chooses what is recommended) |

The AI rates every experience, project and skill (level 0 to 3) and lists them best first; `src/config/ranking.ts` holds how many are recommended per type. Education is not rated. Nothing about the candidate's name or contact details is in the prompt.
