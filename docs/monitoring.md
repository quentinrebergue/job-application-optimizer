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

## Alerts (Alertmanager, email)

Prometheus evaluates the rules; Alertmanager emails the ones of severity `warning` and `critical`. Watchdog (always
firing, it proves the chain works) and the `info` alerts go nowhere.

| Alert | Fires when | Severity |
|---|---|---|
| `NodeMemoryPressure` | the kubelet reports `MemoryPressure` for 2 minutes: it evicts pods next | critical |
| `NodeMemoryLow` | under 400 MiB of memory available for 5 minutes (the kubelet evicts under 250) | warning |
| `PodEvicted` | a pod was evicted (it stays listed until deleted) | warning |
| `AppNoReplicaAvailable` | no replica of the app answers for 2 minutes | critical |
| `KubePodNotReady`, `KubePodCrashLooping`, `KubeNodeNotReady`, `KubeDeploymentRolloutStuck`... | the chart's own, 15 minutes or more: a normal rollout does not trigger them | warning / critical |

Our rules are in `k8s/monitoring/values.yaml` (`additionalPrometheusRulesMap`). The chart's alerts that cannot hold on one
node (CPU and memory "overcommit": always true with one node, quotas, a failed job, memory utilisation) are switched off
there (`defaultRules.disabled`), so that the emails stay worth reading.

### Put it in service

The configuration of Alertmanager holds an SMTP password and your address: it is **not** in Git. Make it a Secret
**before** applying the profile, or the release waits for an Alertmanager that cannot start and Helm rolls back.

1. Copy `k8s/monitoring/alertmanager.example.yaml` to a file of your own (`~/alertmanager.yaml`, `chmod 600`) and fill
   in the SMTP account (the one the app uses, Brevo) and your address. Keep the port **2525**: from the cluster, port 587
   times out (`nc -zv -w 5 smtp-relay.brevo.com 587` from any pod), as the first test of the chain showed.
2. Create the Secret:
   ```bash
   kubectl create secret generic alertmanager-config -n monitoring --from-file=alertmanager.yaml=$HOME/alertmanager.yaml
   ```
3. Apply the profile: `scripts/monitoring-profile.sh normal` (or `minimal`).
4. Check that it is up: `kubectl get pods -n monitoring | grep alertmanager`, and that Prometheus sees it
   (Status > Alertmanagers in the Prometheus interface, `kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-prometheus 9090`).

### Check that it works

- **The mail gets through:** `kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-alertmanager 9093`, then
  send a test alert (replace `localhost:9093` if needed):
  ```bash
  curl -XPOST localhost:9093/api/v2/alerts -H 'Content-Type: application/json' -d '[{"labels":{"alertname":"TestAlert","severity":"warning"},"annotations":{"summary":"Test of the alert chain"}}]'
  ```
  The email arrives after `group_wait` (30 seconds).
- **A real one:** scale the app down (`kubectl scale deployment app -n job-optimizer --replicas=0`); `AppNoReplicaAvailable`
  fires after 2 minutes. Scale it back up. This is also what the external probe (above) sees from outside.
- **A normal deployment stays silent:** sync a deployment and check that no email arrives (a rollout takes well under
  the 2 and 15 minutes the alerts wait).
- **The incident itself** (memory pressure during a rollout) is reproduced on purpose in #31.
