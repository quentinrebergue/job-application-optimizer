# Pausing the production on OVH, and putting it back

How to stop paying for the cluster without losing the data, and how to come back. Nothing here is exercised yet: the first
time, read it all, and do the cut in one sitting.

## What costs, and what is kept

| What | Made by | Cost | In a pause |
|---|---|---|---|
| The managed cluster and its node (`d2-4`) | Terraform, `terraform/k8s.tf` | about 17 €/month | **deleted** |
| The load balancer of the ingress | Kubernetes (the Service of ingress-nginx), **not** Terraform | about 6 €/month | **deleted before the cluster** |
| The volumes (`pgdata` 5 Gi, `pgbackup` 2 Gi, the monitoring ones) | Kubernetes (the PVCs), **not** Terraform | 1 to 3 €/month | **deleted after the last backup** |
| The bucket `fastresume-db-backups` (Roubaix) | By hand in the OVH console | a few cents | **kept**: it is the way back |
| The DNS zone and the domain | `terraform/dns.tf`, and the registrar | about 1 €/month | **kept** |

Never delete the whole Public Cloud project: the bucket goes with it.

The trap is the middle two rows. They are not in Terraform: if the cluster is destroyed first, OVH can leave the load balancer
and the volumes behind, still billed. So the cluster goes last.

## Before the cut

1. **Note what the repository does not say**, while the cluster still answers. These versions are the ones to install again:
   ```bash
   helm list -A
   kubectl get deploy -n argocd -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.spec.template.spec.containers[0].image}{"\n"}{end}'
   kubectl get deploy -n cert-manager -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.spec.template.spec.containers[0].image}{"\n"}{end}'
   ```
   Write the three answers at the end of this file (section "Versions at the pause").
2. **The private `age` key** is in the password manager *and* on paper or a USB stick. Without it the bucket is unreadable.
3. **Every secret is in the password manager**, because the cluster is where they live and the cluster is going:
   `POSTGRES_PASSWORD` and the vault of `ansible/k8s-secrets.yml` (the vault file is on your computer), the `SMTP_*` and
   `EMAIL_FROM` added by hand to `app-secrets`, `AI_TOKEN` (`ai-gateway-secrets`), `backup-offsite` (the two S3 keys and the
   public `age` key), the GitHub token of `ghcr-pull-secret`, the Alertmanager configuration. List them with
   `kubectl get secret -A` and tick each one. A secret that exists only in the cluster is lost for good.
4. **Keep the Terraform folder**: `terraform.tfstate`, `terraform.tfvars` (not in Git). Copy the folder to a safe place.
5. Nobody else writes to the site (the only accounts are the owner's): no one to warn.

## The cut

1. **Stop the writes** (Argo CD syncs by hand, so it will not undo this):
   ```bash
   kubectl scale deployment app -n job-optimizer --replicas=0
   ```
2. **The last backup**, off the cluster as well:
   ```bash
   kubectl create job --from=cronjob/postgres-backup final-backup -n job-optimizer
   kubectl logs -n job-optimizer -f job/final-backup
   ```
   It must end with `off-site copy done: job_optimizer-....sql.gz.age`. If it does not, stop here and fix it: it is the only copy.
3. **Take it to your computer** and check that it opens (the accounts are there):
   ```bash
   scripts/stack.sh pull
   docker compose exec db psql -U app -d job_optimizer -c "SELECT count(*) FROM users"
   ```
   Keep a copy of the `.sql.gz.age` too: `rclone copyto :s3:fastresume-db-backups/<file> <a place that is not the bucket>`.
4. **Remove what Kubernetes made**, so nothing is left behind. First the load balancer, then the volumes:
   ```bash
   helm uninstall monitoring -n monitoring
   helm uninstall ingress-nginx -n ingress-nginx
   kubectl delete namespace job-optimizer monitoring
   ```
   Then check that nothing is left that costs: no Service of type `LoadBalancer`, no volume.
   ```bash
   kubectl get svc -A | grep LoadBalancer      # nothing
   kubectl get pvc -A                          # nothing
   kubectl get pv                              # nothing (a PV that stays is a volume still billed)
   ```
   Also look in the OVH console, Public Cloud: Load Balancer and Block Storage (Volumes) must be empty. Delete by hand what is
   left.
5. **Destroy the cluster only**, without the DNS. Read the plan: it must name the node pool, the cluster and the kubeconfig
   file, and nothing else.
   ```bash
   cd terraform
   terraform plan -destroy -target=ovh_cloud_project_kube.cluster
   terraform destroy -target=ovh_cloud_project_kube.cluster
   ```
6. **The site's address.** The load balancer's IP (`51.68.80.189`, `terraform/dns.tf`) is released and OVH can give it to someone
   else: leave no `A` record on it. Remove `apex_a` and `www_a` from `dns.tf` in a pull request, then `terraform apply`. The
   mail records (MX, SPF, Brevo, DMARC) stay.
7. **The next day, in the OVH cost centre** (Public Cloud, then the project's consumption): only the bucket and the DNS must
   remain. Anything else is something forgotten in step 4.

## Putting it back

1. **Cluster:** `terraform apply` (the variables are in `terraform.tfvars`), which also writes `kubeconfig.yaml`.
2. **Install again**, with the versions noted before the cut: ingress-nginx (`k8s/ingress-nginx/`, chart 4.15.1, then the two
   values files with `--reuse-values`), cert-manager and its `ClusterIssuer` (`k8s/cert-manager/`), Argo CD and its
   `Application` (`k8s/argocd/application.yaml`), the monitoring (`scripts/monitoring-profile.sh normal`).
3. **The secrets**, from the password manager: `ansible-playbook ansible/k8s-secrets.yml` for `app-secrets`, then the others
   by hand (`ai-gateway-secrets`, `backup-offsite`, `ghcr-pull-secret`, SMTP).
4. **The database:** sync the application in Argo CD with the app at 0 replicas, then restore from the bucket as in
   [`restore-postgres.md`](restore-postgres.md) ("Restoring from the copy"). Check the row counts against your computer.
5. **The address:** the load balancer has a new IP. Put it in `dns.tf` (`ip`, and the two `A` records), `terraform apply`,
   then wait for the certificate (cert-manager asks for it once the name points to the new IP).
6. **Start the application** and check `https://fastresume.tech/api/healthz`. Run the restore drill once, as it is the first
   time the full way back is made.

## Versions at the pause

To fill in at step 1 of "Before the cut".

| Component | Version |
|---|---|
| ingress-nginx | chart 4.15.1 |
| cert-manager | |
| Argo CD | |
| monitoring | chart 91.8.2 |
