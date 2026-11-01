# Security

What is protected and how, the secrets and what to do after a leak, and the findings of the review made before the
repository was opened (#207). To report a problem: [`SECURITY.md`](../SECURITY.md).

## What is protected, and how

| Risk | Defence | Where |
|---|---|---|
| Hostile input | Every API route validates its body with a Zod schema (a shape and a size for every field); the sizes come from one table. A test lists the routes and fails on one that reads a body without a schema | `src/schemas/`, `src/config/limits.ts` |
| Other people's data | Every query is scoped by the user of the session; a test reads the data layer and fails on a query that is not | `src/lib/data/`, `src/tests/data-scope.test.ts` |
| Script injection | Content Security Policy with a nonce per request; the violations are reported to `/api/csp-report` | `src/proxy.ts`, `src/lib/security/csp.ts` |
| Cross-site requests | The origin of every state-changing API request is checked; sessions are `HttpOnly`, `Secure`, `SameSite=Lax`, 7 days | `src/lib/security/origin.ts`, `src/lib/auth/session.ts` |
| Guessing passwords | bcrypt, a queue in front of the hashing, a limit on tries per address, the same answer whether an account exists or not | `src/lib/auth/`, `services/password-hasher/` |
| Runaway cost | Rate limits, per-user AI quotas (hour, day, week), a monthly cap in euros, a kill switch | `src/lib/ai/`, `services/ai-gateway/` |
| A hostile PDF or template | The PDF is read by pdfium in WebAssembly in a pod with no network; the PDF is made by Typst in a pod with a read-only filesystem, no capabilities and no outgoing traffic | `services/pdf-text/`, `services/resume-renderer/`, `k8s/*/networkpolicy.yaml` |
| Personal data and the AI | The name, email, phone, links and date of birth are taken out of any text by code before the AI reads it; nothing is sent to the AI that the privacy page does not say | `src/lib/import/personal.ts`, `src/lib/ai/header.ts` |
| Lost database | Nightly dump, a copy encrypted with `age` in another site, a restore drill | `docs/runbooks/restore-postgres.md` |
| Vulnerable dependencies | Dependabot (npm, Go, Docker, Actions), `npm audit` and a scan of the history for secrets in CI | `.github/dependabot.yml`, `.github/workflows/security.yml` |

## The protection of `master`

A ruleset, kept as a file so that it can be read and redone: nobody deletes `master` or rewrites its history, not even the owner
without first editing the ruleset. A push that adds commits on top (what the delivery job does with the image tags, and what a
merge does) is still allowed.

```bash
gh api repos/quentinrebergue/job-application-optimizer/rulesets -X POST --input .github/rulesets/master.json
```

**Not yet: a pull request for every change.** Asking for one (and for the checks to pass) would also stop the delivery job, which
commits the new image tags to `master` with the token of the workflow. GitHub does not accept the GitHub Actions application as a
bypass actor on a repository of a personal account (the API answers `422: Actor GitHub Actions integration must be part of the
ruleset source or owner organization`). The way is a GitHub App of its own, installed on the repository and put in the bypass list,
that the delivery job uses to push: a ticket tracks it. Until then every change still goes through a pull request by habit
(`CONTRIBUTING.md`), and the repository accepts no push from anyone but its owner.

Also turn on, in the settings of the repository: only squash merges, branches deleted after the merge, private vulnerability
reporting, and Dependabot alerts.

## The secrets

Nothing secret is in the repository. Each one lives in the cluster (or on the owner's computer) and is read by the owner only.

| Secret | What it is for | Where it lives | Rotation |
|---|---|---|---|
| `POSTGRES_PASSWORD` | The database user `app` | Secret `app-secrets` (made by `ansible/k8s-secrets.yml` from the vault kept on the owner's computer, not in Git) | Change it in PostgreSQL (`ALTER USER app PASSWORD ...`), in the vault, run the playbook, restart the app and the backup job |
| `SMTP_*`, `EMAIL_FROM` | Sending mail (Brevo, port 2525) | Secret `app-secrets`, added by hand | New key in Brevo, update the Secret, restart the app |
| `AI_TOKEN` | The AI provider (Mistral) | Secret `ai-gateway-secrets` | New key in the provider's console, update the Secret, restart the gateway. The monthly cap of the provider is the last backstop |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Writing the encrypted backups to the bucket | Secret `backup-offsite` | New credentials for the `backup-writer` user in the OVH console, update the Secret |
| `AGE` private key | Reading the backups | The owner's password manager and one copy offline. **Never in the cluster** | A new pair: put the new public key in `backup-offsite`; old backups need the old key until they leave the 7 days |
| OVH API credentials | Terraform | `terraform/terraform.tfvars`, on the owner's computer, not in Git | New application key in the OVH console |
| `ghcr-pull-secret` | Pulling the images from the registry | Secret in the namespace | New token on GitHub, update the Secret |
| The Argo CD admin password | The Argo CD interface | Secret `argocd-initial-admin-secret`, changed at first login | `argocd account update-password` |

The sessions are random 256-bit identifiers stored in the database; there is no signing key to protect.

### After a leak

1. **Find which secret and since when** (the log of the provider, `git log -S`, the access log).
2. **Rotate it first, clean after**: a secret that was ever public is not secret any more, whatever is deleted from Git.
3. **Read what it could reach**: the database password reaches every user's data (the database is not exposed outside the cluster,
   so a leak of the password alone is not enough, but rotate it all the same); the AI key reaches the provider's cost, bounded by
   its monthly cap; the SMTP key lets someone send mail as the site.
4. **Tell the people concerned** when personal data may have been read, and the CNIL within 72 hours if it is a breach.
5. **Write a post-mortem** in `docs/incidents/` and one ticket per action.

## Findings of the review of 2026-11-01

| Check | Result |
|---|---|
| **Inputs** | The routes that read a body all go through a schema (listed by script, none without). The server actions of login, sign-up and reset use `auth-schemas`; the resume options and the profile have their own. A web address is saved complete and refused unless http(s) |
| **Secrets in the history** | A scan of every revision for keys, tokens, private keys and password assignments found only test fixtures (passwords of the load-test accounts and of unit tests). `gitleaks` over the 449 commits of every branch found 2 things, both the same line of `personal.ts` (a variable named `linkedin...` taken for a LinkedIn client id): allowed in `.gitleaks.toml`, nothing else. The scan repeats on every pull request |
| **Personal data in the history** | No personal file was ever committed. One personal email address, used as the contact of the TLS certificates, is in two old commits and was replaced by `contact@fastresume.tech` in the current files |
| **The vault** | `ansible/group_vars/app_servers/vault.yml` (encrypted with Ansible Vault) was in the history. It is no longer tracked. It held the database password only. The ciphertext stays in the old commits: the database password is rotated before the repository is opened (above), so the ciphertext opens nothing |
| **Errors** | Three routes of the ranking returned the text of any unexpected error (a database message could reach the user). They now answer a plain sentence and log the error. The other routes answer fixed messages or messages of the services written for a user |
| **Dependencies** | `npm audit` (production): 7 advisories, 3 low and 4 moderate, all through `react-email` (the preview tool, its HTML-to-text step and `glob`), none reachable from a request: the mail templates are our own. The ones with a fix that does not break are applied; the others wait for a major version of `react-email`. Go modules: `govulncheck` is not run yet |

### Known and not fixed

- **The author address of the work branches.** The commits made on the branches before their squash merge (186 of them, and the
  pull requests that show them) carry the school address of the author, `quentin.rebergue@epita.fr`; the commits of `master`
  are made by GitHub and carry the `noreply` address. The history of `master` alone is clean. From now on the commits use the
  `noreply` address and GitHub blocks a push that would expose the real one (see below).
- **Session identifiers are stored as they are** in the table `sessions`, unlike the mail links, which are stored hashed. Someone who
  reads the database (or a backup) could use a session that has not expired. Hashing them is a small change worth doing.
- **`master` accepts a direct push by its owner.** The ruleset forbids deleting it and rewriting it; requiring a pull request needs an identity for the delivery job that can bypass it (see above).
- **`govulncheck` for the Go services** and a scan of the container images are not in the CI yet.
