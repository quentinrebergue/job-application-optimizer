# k8s

Kubernetes manifests, applied by Argo CD from `kustomization.yaml` (the sync is manual). The images' tags are the only lines the CD pipeline edits.

| Path | Description |
|---|---|
| `kustomization.yaml` | The list of manifests and the tag of each image |
| `namespace.yaml`, `priorityclass.yaml` | The `job-optimizer` namespace; the priority of the user-facing workloads over monitoring when the node is short of memory |
| `app/` | The Next.js app: `deployment.yaml`, `service.yaml`, the `ingress*.yaml` (the app, its static files, the PDF import with its larger body limit) |
| `postgres/` | The database `statefulset.yaml` and `service.yaml`, the `backup-pvc.yaml` volume, the `backup-cronjob.yaml` of the nightly dump and its encrypted copy off the cluster, and `restore-drill-job.yaml` (run by hand, not part of the sync) |
| `ai-gateway/`, `password-hasher/`, `pdf-text/`, `resume-renderer/` | One folder per service: `deployment.yaml`, `service.yaml`, `networkpolicy.yaml` (who may call it, and where it may call) |
| `db-migrator/` | `job.yaml`: the migrations, run as a pre-sync hook |
| `cert-manager/` | The `ClusterIssuer` for the TLS certificates |
| `argocd/` | The Argo CD `Application` that watches this folder |
| `ingress-nginx/` | The non-default values of the ingress controller's Helm chart (not managed by Argo CD), and why |
| `monitoring/` | The values of the Prometheus, Grafana and Alertmanager chart, with our alert rules (not managed by Argo CD; `scripts/monitoring-profile.sh` applies them), and `alertmanager.example.yaml`, the template of the Alertmanager configuration kept as a Secret |
