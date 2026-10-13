# docs/reports

Measured reports: what a change did, with the commands run and their results, so anyone can reproduce them. One file per report, named `YYYY-MM-DD-<topic>.md`, linked to its ticket and PR.

| Report | Topic |
|---|---|
| [2026-10-06-frontend-cleanup-sizes.md](2026-10-06-frontend-cleanup-sizes.md) | Frontend cleanup (#100): CSS, JS and image sizes before and after |
| [2026-10-09-ai-ranking-case-study.md](2026-10-09-ai-ranking-case-study.md) | AI ranking (#44, #184, #192): from 3-10 EUR to 0.60 EUR per 1,000 rankings, the Go gateway, the evaluation tool, what worked, what did not, why more offers mattered, the stress test with big libraries, and the protections around the feature |
| [load-tests.md](load-tests.md) | The load tests (#49): the history of the breaking point of each scenario, run after run, and how to read it |
| [2026-10-13-pdf-import-spike.md](2026-10-13-pdf-import-spike.md) | Import of a resume in PDF (#110): poppler against a Go library on one and two columns, a scan, broken files; why a separate hardened service; what it costs |
