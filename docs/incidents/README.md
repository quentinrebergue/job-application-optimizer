# Incidents

Post-mortems of production incidents. The goal is to learn from each one and to
make sure the same failure cannot happen twice, not to find someone to blame.

## When to write one

Write a post-mortem when any of these is true:

- the service was down or degraded for users,
- data was lost or at risk,
- someone had to intervene by hand to restore it,
- the cause was surprising, even if the impact was small (near miss).

When in doubt, write one. A short post-mortem is better than none.

## Principles

- **Blameless.** People act on the information and tools they have. If a person
  could make the mistake, the system allowed it: that is what we fix.
- **Facts from logs.** Timelines come from event timestamps and command output,
  not from memory.
- **Trigger is not cause.** A deployment triggers an incident; the missing margin,
  probe or alert is the cause.
- **Actions or it did not happen.** Every post-mortem ends with action items that
  have a type, a priority and a status. An incident is closed when they are done.
- **No secrets.** Never paste tokens, passwords, connection strings or personal
  data. Redact before committing.

## Severity

| Level | Meaning | Example |
|---|---|---|
| **SEV1** | Full outage, or data loss | Site down for everyone, database lost |
| **SEV2** | Major feature broken or heavy degradation | Login or PDF generation failing |
| **SEV3** | Partial or short degradation, workaround exists | One page slow, brief errors on deploy |
| **SEV4** | No user impact, near miss | A deploy that almost failed, caught in time |

## Process

1. **During the incident:** restore service first, investigate second. Keep a
   rough list of times and commands as you go (the terminal history and the
   cluster events are the source of truth).
2. **Within a few days:** copy [`TEMPLATE.md`](TEMPLATE.md) to
   `YYYY-MM-DD-short-slug.md`, fill it in from the logs.
3. **Review:** reread it as someone who was not there. Does the timeline explain
   the impact? Is the root cause something you can change?
4. **Track the actions:** open an **Incident action** ticket for each action item
   (New issue → Incident action), link it in the report's table, and keep the
   status up to date. See [`CONTRIBUTING.md`](../../CONTRIBUTING.md).
5. **Close:** when all actions are done or consciously dropped (with a reason),
   set the status to *Closed* and update the index below.

## First commands

When something is down, go from the symptom outward and stop when you can
explain it. These are the commands that found the 2026-10-02 cause in two minutes.

```bash
# 1. Is it really down, and what does the user see?
curl -s -o /dev/null -w "%{http_code}\n" https://fastresume.tech/login

# 2. What state are the pods in?
kubectl get pods -n job-optimizer

# 3. Why is a pod not running? (read the Events section at the bottom)
kubectl describe pod <pod> -n job-optimizer

# 4. What happened recently, in order?
kubectl get events -n job-optimizer --sort-by=.lastTimestamp

# 5. Is the node itself in trouble? (look at Taints and Conditions)
kubectl describe node <node>

# 6. How full are the node and the pods?
kubectl top nodes
kubectl top pods -A --sort-by=memory

# 7. What did a crashed or evicted pod say?
kubectl logs <pod> -n job-optimizer --previous
kubectl get pod <pod> -n job-optimizer -o jsonpath='{.status.reason}{" "}{.status.message}{"\n"}'

# 8. What is Argo CD's view?
kubectl get application job-optimizer -n argocd
```

## Index

| Date | Incident | Severity | Duration | Status |
|---|---|---|---|---|
| 2026-10-02 | [Production down after a rollout, node under memory pressure](2026-10-02-memory-pressure-during-rollout.md) | SEV2 | ~5 min | Actions in progress |
