# Monitoring

What watches fastresume.tech, and how to read it.

## External uptime check (UptimeRobot)

Runs outside the cluster, so it still tells us when the whole cluster is down
(an in-cluster monitor dies with it). Set up in the UptimeRobot web interface,
not as code.

| Setting | Value |
|---|---|
| Monitor type | HTTP(s) |
| URL | `https://fastresume.tech/api/healthz` |
| Interval | 5 minutes (free plan) |
| Alert when | anything other than 2xx (the route answers 503 when the database does not answer) |
| Notifications | push on the phone (UptimeRobot app) and email |

`/api/healthz` is public and answers `{"status":"ok"}` when the app and its
database work. It is the same route the Kubernetes readiness probe uses; the
liveness probe uses `/api/livez`, which does not depend on the database.

### Check that it works

Scale the app down on purpose, wait for the phone notification (a few minutes),
then bring it back:

```bash
kubectl scale deployment app -n job-optimizer --replicas=0
kubectl scale deployment app -n job-optimizer --replicas=1
```

Argo CD does not self-heal here (manual sync), so the app stays down until
scaled back up. UptimeRobot also sends a "up again" notification.

## In the cluster (Prometheus, Grafana)

Managed with Helm, not by Argo CD: `scripts/monitoring-profile.sh`. Values in
`k8s/monitoring/`. The `minimal` profile turns Grafana off to save memory.
Prometheus scrapes every 60 s, so a memory spike shorter than a minute does not
show in it.
