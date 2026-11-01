# .github

| Path | Description |
|---|---|
| `workflows/` | `ci.yml`: on a pull request: finds what changed, then builds and tests only the parts that need it (app, each service, images) |
| | `cd.yml`: on a merge to `master`, builds and pushes the images that changed, commits their new tags to `k8s/kustomization.yaml` |
| `ISSUE_TEMPLATE/` | The forms for a bug, a task and an incident action |
| `dependabot.yml` | One pull request per dependency update (npm, Go modules, Docker, Actions) |
