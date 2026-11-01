# services/resume-renderer

Receives a resume payload and answers a PDF. The templates are compiled with the `typst` command. Its pod has no outgoing network (`k8s/resume-renderer/networkpolicy.yaml`).

| Path | Description |
|---|---|
| `main.go` | Starts the server; checks at startup that Typst runs |
| `internal/api/` | `POST /render`, `GET /templates`, `GET /healthz`, `GET /readyz`, `GET /metrics`; `middleware.go` (status of each answer), `metrics.go` (counters whose labels never hold client text) |
| `internal/config/` | The environment: Typst and font paths, render timeout, concurrent renders |
| `internal/model/` | The shape of a request (`payload.go`), its decoding (`decode.go`) and its validation (`validate.go`) |
| `internal/render/` | `typst.go` (one temporary directory per call, one Typst process), `data.go` (the `data.json` a template reads), `check.go` (the Typst version) |
| `internal/templates/` | `manifest.go` (a template and its options), `options.go` (options checked against the manifest, defaults filled), `store.go` (the templates embedded in the binary), `builtin/` (`classic/` and `compact/`: each a `main.typ` and a `manifest.json`) |
| `Dockerfile`, `.dockerignore`, `go.mod`, `go.sum` | The image and the module |
