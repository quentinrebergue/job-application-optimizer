# ansible

| Path | Description |
|---|---|
| `k8s-secrets.yml` | Creates or updates the `app-secrets` Secret of the cluster from the encrypted vault (`ansible-playbook k8s-secrets.yml`) |
| `group_vars/` | `app_servers/vault.yml`: the secrets, encrypted with Ansible Vault |
| `playbook.yml`, `templates/`, `ansible.cfg` | Legacy: the setup of the single server used before Kubernetes (Docker, the app, a database backup script) |
