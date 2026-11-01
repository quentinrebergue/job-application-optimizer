# services/pdf-text

Reads the text of a PDF, in reading order, for the resume import. The reader is a C++ library (pdfium) run inside WebAssembly by wazero, in a container with no network; a file is read from memory and never written.

| Path | Description |
|---|---|
| `main.go` | Starts the server |
| `internal/api/` | `POST /extract` (a PDF in, its text out), `GET /healthz`, `GET /readyz` |
| `internal/config/` | The environment: size, page, character, queue and time limits |
| `internal/reader/` | `reader.go` (opens the file, one at a time), `layout.go` (puts the fragments of a page in reading order, one or two columns), `testdata/` (the PDFs the tests read) |
| `smoke.sh` | Starts the image the way the pod does and reads real PDFs, to check that the limits are enough |
| `Dockerfile`, `.dockerignore`, `go.mod`, `go.sum` | The image and the module |
