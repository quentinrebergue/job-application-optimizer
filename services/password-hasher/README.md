# services/password-hasher

bcrypt hashing and checking as a service, so that the CPU cost of a login leaves the app. A few hashes at a time, a queue in front, and an answer "busy" when the queue is full.

| Path | Description |
|---|---|
| `main.go` | Starts the server |
| `internal/api/` | `POST /hash`, `POST /verify`, `GET /healthz`, `GET /readyz` |
| `internal/config/` | The environment: bcrypt cost, hashes at a time (`MAX_CONCURRENT`), queue length (`MAX_QUEUE`) |
| `internal/hasher/` | `hasher.go`: bcrypt hash and check, with the 72-byte rule of bcrypt kept identical to the one the app used before |
| `Dockerfile`, `.dockerignore`, `go.mod`, `go.sum` | The image and the module |
