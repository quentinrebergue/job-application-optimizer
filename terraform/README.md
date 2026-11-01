# terraform

The cloud resources on OVHcloud: the managed Kubernetes cluster and the DNS of the domain. The state, the variables file and the kubeconfig are not in the repository.

| File | Description |
|---|---|
| `versions.tf` | The Terraform and OVH provider versions, and the provider's configuration (`.terraform.lock.hcl` pins the versions) |
| `variables.tf` | The inputs: the OVH credentials, the project, the region, the flavor, an SSH key |
| `main.tf` | Lookups of a flavor and an image, left from the first single-server setup |
| `k8s.tf` | The cluster `job-optimizer-k8s` (Strasbourg), its node pool (one `d2-4` node) and the `kubeconfig` file it writes |
| `dns.tf` | The DNS zone of the domain, as code |
| `outputs.tf` | What `terraform output` shows |
