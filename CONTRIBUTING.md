# Contributing

How work flows from an idea to production in this repository.

## 1. Everything starts as a ticket

Work is tracked as GitHub issues on the
[project board](https://github.com/users/quentinrebergue/projects/1). If it is
not a ticket, it will be forgotten. Use the issue forms (**New issue**):

| Form | When |
|---|---|
| **Bug** | Something is broken or behaves unexpectedly |
| **Task** | A piece of work: feature, improvement, chore. Needs a goal and a "done when" checklist |
| **Incident action** | A follow-up from a post-mortem. Links to the report and says how we will verify the fix |

### Labels

Every ticket has one label of each kind:

- **Type:** `type: bug`, `type: feature`, `type: chore`, `type: tech-debt`,
  `type: incident-action`
- **Area:** `area: app`, `area: infra`, `area: ci-cd`, `area: monitoring`,
  `area: database`, `area: docs`
- **Priority:** `P0: urgent` (production affected, do now), `P1: high`,
  `P2: medium`, `P3: low`, `P4: someday` (ideas, no commitment)

### Board columns

`Todo` (not started), `In Progress` (being worked on), `Done` (closed). Move a
ticket to `In Progress` when you start it. It moves to `Done` by itself when it
is closed.

## 2. One ticket, one branch, one pull request

1. Pick a ticket, starting with the highest priority.
2. Create a branch from an up-to-date `master`, named after the work
   (`add-priorityclass`, `docs-ticket-workflow`). Never commit to `master`.
3. Make small commits with a message that says what changed and why.
4. Open a pull request and put **`Closes #N`** in its description, so the
   ticket closes by itself on merge.
5. Wait for CI. A job skipped by the path filter counts as passed.
6. Merge with a squash merge, and delete the branch:

   ```bash
   gh pr merge --squash --delete-branch
   ```

## 3. Deploying

Merging to `master` builds the images and commits their new tags to
`k8s/kustomization.yaml` (see `.github/workflows/cd.yml`). Argo CD then shows
the diff, and the sync is manual. Database migrations run as a PreSync hook.

An image is rebuilt when its files changed **since its last deploy** (the commit
of its tag in `kustomization.yaml`), not only in the last push: a CD run that
failed or was cancelled is caught up by the next one, and a tag is never moved
back to an older commit. To rebuild and deploy every image, run the CD by hand
(Actions → CD → Run workflow). Changing only the image of the migrator (a
PreSync hook) does not make Argo CD OutOfSync: sync anyway, the hook runs on
every sync.

The monitoring stack is not managed by Argo CD: use
`scripts/monitoring-profile.sh`.

## 4. Incidents

Follow [`docs/incidents/README.md`](docs/incidents/README.md). Every action item
of a post-mortem gets its own **Incident action** ticket, linked from the report,
and the incident is closed only when they are all done or consciously dropped.
