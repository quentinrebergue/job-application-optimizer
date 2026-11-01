# ansible

| Path | Description |
|---|---|
| `k8s-secrets.yml` | Creates or updates the `app-secrets` Secret of the cluster from the encrypted vault (`ansible-playbook k8s-secrets.yml`) |
| `group_vars/` | `app_servers/vault.example.yml`: the template of `vault.yml`, the secrets encrypted with Ansible Vault, which stays on the owner's computer and is not in Git |
| `playbook.yml`, `templates/`, `ansible.cfg` | Legacy: the setup of the single server used before Kubernetes (Docker, the app, a database backup script) |
