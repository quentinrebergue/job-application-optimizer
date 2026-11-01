# services/ai-gateway

HTTP gateway between the app and the AI provider (any OpenAI-compatible chat endpoint). The app never calls the provider itself.

| Path | Description |
|---|---|
| `main.go` | Starts the server, reads the configuration, shuts down cleanly |
| `internal/api/` | `POST /v1/complete` (a prompt in, a JSON document out), `GET /healthz`, `GET /readyz`, the limit on the size of a request, the kill switch (`AI_ENABLED=false`) |
| `internal/config/` | The environment: provider address, key, model, timeouts, retries, output limits |
| `internal/llm/` | The `Completer` interface and its client: one HTTP call per attempt, retries on network errors, 429 and 5xx |
| `Dockerfile`, `go.mod` | The image and the module |
