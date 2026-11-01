# services

The five Go services. Each has its own image, its own `go.mod`, and talks to the others over HTTP only.

| Folder | Role |
|---|---|
| `ai-gateway/` | The only way to the AI provider: key, timeouts, retries, strict JSON answers, a limit on the size of a request, a kill switch |
| `resume-renderer/` | Turns a resume payload (JSON) into a PDF with a Typst template |
| `pdf-text/` | Reads the text of a PDF (pdfium in WebAssembly, no network) for the resume import |
| `password-hasher/` | bcrypt hashes and checks, a few at a time, in a service of its own |
| `db-migrator/` | Applies the SQL migrations compiled into its binary; runs as a pre-sync Job |

Every service follows the same layout: `main.go` (configuration, wiring, graceful shutdown), `internal/api` (HTTP handlers), `internal/config` (environment), then the packages of its own. Each `*_test.go` tests the file of the same name.
