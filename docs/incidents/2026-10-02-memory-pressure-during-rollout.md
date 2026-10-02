# Incident: production down after a rollout, node under memory pressure

| | |
|---|---|
| **Date** | 2026-10-02 |
| **Duration** | About 5 minutes of downtime: old pod removed at 15:50:17, replacement running at 15:55:19 (CEST) |
| **Impact** | `fastresume.tech` answered `503` (no application pod running). No data loss. |
| **Detected by** | A person watching an Argo CD sync that "took a long time". No alert fired. |
| **Status** | Service restored by itself once the pressure fell. Probes and memory requests are rolled out and verified. The source of the memory spike is **not identified** (too short for the 30 s scrape interval); detection and sizing actions are open |

## 1. Summary

An Argo CD sync rolled out three changes at once: a new database-migration Job,
a new `resume-renderer` pod and a new `app` pod. The cluster has a **single node
with about 2 GiB of allocatable memory** (4 GB of RAM). During the rollout the
kubelet's available memory briefly fell under its 250 MiB threshold, it
**evicted the new `app` pod** and put a `memory-pressure:NoSchedule` taint on the
node. The old `app` pod had already been removed and the replacement could not be
scheduled because of the taint, so no `app` pod was left. The migration itself
succeeded.

The trigger was the deployment. What turned a short eviction into an outage is
certain: the application had no memory requests (so it was the first to be
evicted) and no readiness probe (so the old pod was removed before the new one was
usable). What caused the memory spike itself is **not established**: a measurement
taken afterwards shows about 1.2 GiB available, far above the threshold (section 3).

## 2. How it was detected, step by step

The method is to go from the symptom outward: user-facing, then workload,
then scheduler, then node, then capacity. Each step either explains the
symptom or tells you where to look next.

| # | Question | Command | What it showed |
|---|---|---|---|
| 1 | Is it really down? | `curl -s -o /dev/null -w "%{http_code}" https://fastresume.tech/login` | `503`: the ingress has no healthy backend |
| 2 | What state are the pods in? | `kubectl get pods -n job-optimizer` | `app-…-v4jxw  Error`, `app-…-jh45g  Pending`, no running app pod. `resume-renderer` was `Running` |
| 3 | Why is one pod `Pending`? | `kubectl describe pod <pending-pod>` (Events section) | `FailedScheduling: 1 node(s) had untolerated taint(s)` |
| 4 | Which taint, and why? | `kubectl describe node <node>` (Taints, Conditions) | `node.kubernetes.io/memory-pressure:NoSchedule`, condition `MemoryPressure=True` since 15:50 |
| 5 | Why is the other pod in `Error`? | `kubectl get pod <pod> -o jsonpath='{.status.reason}{.status.message}'` | `Evicted: The node was low on resource: memory. Threshold quantity: 250Mi, available: 228336Ki` |
| 6 | How full is the node, and who uses it? | `kubectl top nodes`, `kubectl top pods -A --sort-by=memory` | `kubectl top` showed 125-130% of **allocatable**, a misleading figure (see section 3). Biggest consumers: Grafana 394 Mi, Prometheus 355 Mi, Argo CD application controller 263 Mi, Canal 189 Mi |
| 7 | Did the migration cause it? | `kubectl get events -n job-optimizer --sort-by=.lastTimestamp` | `Job db-migrator: Completed` about 7 s after start. The migration is not the problem |
| 8 | Why was nothing there to take over? | Same events, rollout lines | Old ReplicaSet scaled to 0 in the same second the new pod's container started (the app has **no readiness probe**, so a started container counts as ready); the new pod was evicted right after |

Two things made the investigation slower than it should have been:

- The Argo CD UI only said "progressing". The explanation was in Kubernetes
  events and node conditions, not in Argo CD.
- Nothing alerted us. Alertmanager is disabled, and there is no external probe
  on the site.

## 3. What happened

### Timeline (approximate, from event timestamps)

| Time | Event |
|---|---|
| 15:50:02 | Sync started from Argo CD. PreSync hook: `db-migrator` Job created, pulls its image (3.8 MB, 3 s) |
| 15:50:07 | Job `Completed` (`"applied":0`, nothing to migrate) |
| 15:50:10 | Sync phase: new `app` pod and new `resume-renderer` pod created |
| 15:50:11 | Node free memory under 250 MiB (228 MiB). New `app` pod **evicted**; node gets `MemoryPressure=True` and the `NoSchedule` taint |
| 15:50:17 | Old `app` pod killed: the Deployment already counted the new pod as available, since its container had started and the app has no readiness probe |
| 15:50:20 | Replacement `app` pod created, `FailedScheduling` (taint). **No application pod left** |
| ~15:52 | Person notices the sync is slow, starts investigating |
| ~15:54 | Cause of the missing pod identified (steps 1 to 6 above). The planned mitigation (scale Grafana to 0) was **not** run |
| 15:55:19 | Pressure gone on its own, kubelet lifts the taint, replacement `app` pod starts. Site answers `200` again |

### Why the node ran out of memory

The node is a `d2-4` flavor: 4 GB of RAM, but only **about 1.93 GiB allocatable**
to pods after the system reserve. Observed at the time:

- `kubectl top nodes` showed about 2.4-2.6 GiB, **125-130% of allocatable**. That
  percentage is misleading: it divides the node's working set by the memory
  *allocatable to pods*, while the kubelet evicts based on the memory *available*
  on the node. Measured later with Grafana still running, the node had
  **1234 MiB available** (working set 2581 MiB, usage 3203 MiB), a margin of about
  1 GiB over the 250 MiB threshold. At the time of the eviction, available memory
  was 228 MiB, so the kubelet's signal dropped by roughly 1 GiB for a moment. Its
  source is not identified (see "What Prometheus showed" below).
- Requests were 57% and limits 83% of allocatable. These numbers look healthy,
  and that is the trap: the scheduler only reasons about **requests**, not about
  what pods really use.
- The monitoring stack (Grafana, Prometheus, exporters) uses more than a third of
  the allocatable memory on a cluster that runs one small application. It is not
  proven to have caused the spike.

### Why the application was the one that died

The `app` Deployment declares **no `resources`**. Kubernetes gives such a pod the
**BestEffort** QoS class, the first to be evicted under memory pressure. Pods
with memory requests (Prometheus, Grafana, ...) are Burstable and are protected
over it. The least important component for availability was the best protected,
and the most important one was the most exposed.

### Why a rollout was enough to tip it over

A Deployment with one replica uses `RollingUpdate` with `maxSurge: 25%`
(rounded up to 1) and `maxUnavailable: 25%` (rounded down to 0): the new pod must
start **before** the old one stops, so for a short time the app needs **double**
its memory. The same sync also started a Job pod and replaced the renderer the
same way. Three changes at the same moment, on a node where something briefly
took about 1 GiB.

The previous deployments of the app (earlier the same day) had succeeded with the
same strategy, which says the margin was already thin and that the renderer
(added since) and the monitoring stack took the rest.

## 4. Root causes and contributing factors

**Root cause (confirmed):** the critical workload was the least protected against
eviction (BestEffort) and the rolling update had no readiness signal, so a
transient eviction left no pod running.

**Unconfirmed cause of the spike:** see section 8. Until it is explained, adding
headroom is a reasonable precaution, not a proven fix.

Contributing factors:

1. Single node: no second node to absorb pods, no real high availability.
2. `app` has no requests and no limits (BestEffort).
3. Monitoring is heavy relative to the node and has no priority below the app.
4. Default rolling-update strategy needs double memory for the app.
5. A single sync changes three workloads simultaneously.
6. No alert on `MemoryPressure`, on pods not ready, or on the site itself.
7. No capacity check before deploying (nobody looked at `kubectl top nodes`).
8. **No readiness probe on `app`.** Kubernetes treated the new pod as ready the
   instant its container started, and removed the old pod immediately. The rolling
   update protects nothing without a readiness signal: it would have kept the old
   pod until the new one really served traffic. The same gap means each normal
   deploy sends traffic to a Next.js server that may not be listening yet.

## 5. What went well

- The **PreSync gate worked**: the migration ran first, finished in seconds, and
  would have blocked the sync if it had failed.
- The **baseline of the production database** (done beforehand) avoided
  replaying migration 010, which is not re-runnable.
- Immutable image tags (commit SHA) made the state unambiguous: the exact images
  that were supposed to run were known.
- The cause was found in about two minutes with standard `kubectl` commands.
- No data was lost: PostgreSQL (a `StatefulSet` with its own volume) was untouched.

## 6. What went badly

- **Detection by luck.** Without a person watching, the outage would have gone on.
- **No automatic recovery.** The taint stays for a few minutes after the pressure
  ends, and nothing frees memory by itself.
- **No signal in Argo CD** beyond "progressing".

## 7. Actions

### Immediate mitigation

**What actually happened:** nothing was done. The memory pressure ended on its own
and the kubelet lifted the taint about five minutes after the eviction
(15:55:19), after which the pending pod was scheduled.

**What was planned and not run:** scale Grafana to zero to free about 390 MiB.
Keep it as an option for the next occurrence (it is a visualisation tool, nothing
depends on it, and its state stays on its volume):

```bash
kubectl scale deployment monitoring-grafana -n monitoring --replicas=0
```

The kubelet lifts the taint after a short delay and the pending pod is scheduled.

### Short term (a few lines of YAML each)

| Action | Why |
|---|---|
| Add a `readinessProbe` (and a `livenessProbe`) to `k8s/app/deployment.yaml` | The rolling update waits for a pod that really answers before removing the old one. Also removes the brief errors on every normal deploy |
| Add `resources` (requests and a memory limit) to `k8s/app/deployment.yaml` | The app becomes Burstable and is no longer evicted first. The limit also keeps one leaking pod from taking the node |
| Use a `PriorityClass` for the app above the monitoring pods | Under pressure, the kubelet and scheduler favour the app |
| Lower memory limits and retention for Grafana and Prometheus in `k8s/monitoring/values.yaml` | Gives about 300-400 MiB back |
| Set `strategy.rollingUpdate` to `maxSurge: 0, maxUnavailable: 1` for the app | No double memory, at the price of a few seconds of unavailability. A conscious trade-off on a single node |

### Structural (needs a decision and a cost)

| Option | Trade-off |
|---|---|
| Bigger node flavor | Simplest, restores headroom. Monthly cost goes up. Less urgent than first assumed (kernel margin was about 1.3 GiB), but the kubelet's view is thin |
| Second node | Real rolling updates and resilience to a node failure. Doubles the compute cost and needs the app to tolerate two replicas (sessions are already stored in Postgres, so it should) |
| Remove or externalise the monitoring stack | Frees the most memory, but loses the observability we are building |

### Detection (so that nobody has to be watching)

- Enable Alertmanager with rules for `NodeMemoryPressure`, `KubePodNotReady`,
  `KubePodCrashLooping` and pod evictions.
- Add an external HTTP probe on `https://fastresume.tech` (blackbox exporter or
  an uptime service), alerting on non-2xx.
- Add a pre-deploy capacity check to the runbook (`kubectl top nodes`: do not
  sync above a chosen threshold).
- Show Argo CD sync and health status in the same place as the alerts.

### Verification

Once fixed, reproduce the incident on purpose (a chaos exercise): trigger a
rollout while loading the node, and check that the app stays up, that the alert
fires, and that recovery is automatic. An incident is only closed when the same
trigger no longer causes the same failure.

### What Prometheus showed (investigated after the incident)

Prometheus scrapes every 30 s and keeps 7 days, so the incident window could be
replayed (15:46 to 15:58 CEST). Queries and results:

| Metric | Result |
|---|---|
| `node_memory_MemAvailable_bytes` (kernel view) | Never below **1346 MiB** (at 15:50:30), peak 1547 MiB. Total RAM 3816 MiB |
| `node_memory_MemFree_bytes` | Low of 149 MiB at 15:49:30, up to 393 MiB. Free memory is low by design: the kernel uses the rest as page cache |
| Page cache (`Cached` + `Buffers`) | 1302 to 1390 MiB, of which about 700 MiB is *active* file cache |
| Sum of pod working sets | 1634 to 1803 MiB |
| Largest pods | Grafana 392 to 395, Prometheus 355 to 386, Argo CD application controller 159 to **264** (rose by about 105 MiB during the sync), Canal 181 to 193 |

Findings:

1. **No sample comes close to the kubelet's 250 MiB threshold.** The kernel's own
   estimate never dropped under 1.3 GiB. The eviction was therefore triggered by a
   moment shorter than the 30 s scrape interval, which Prometheus cannot show.
2. **The two signals measure different things.** The kubelet computes
   `memory.available` as capacity minus the *working set*, and the working set
   includes **active file cache**. The kernel's `MemAvailable` counts reclaimable
   cache as available. With about 1.3 GiB of cache on a 3.8 GiB node, a burst of
   file activity can make the kubelet see far less free memory than the kernel
   does, without any process using more memory.
3. **Most likely trigger (hypothesis, not proven):** three image pulls and layer
   extractions at the same instant (app, renderer, migrator), plus the Argo CD
   controller's +105 MiB, plus three pods starting together. This fits the
   timing but the data cannot confirm it.

What this changes: the node is not "full" in the kernel's sense. The weak point is
the kubelet's thin margin on a small node combined with a workload that was the
first to be evicted. That makes the already-applied fixes (requests, probes) the
right first move, and makes a bigger node less urgent than first thought.

## 8. What I would also check (not verified yet)

- The real memory footprint of one `app` pod at idle and under load, to size
  requests and limits from data instead of guessing.
- **Confirm the hypothesis by reproducing it.** Trigger a sync that changes all
  three images while sampling the kubelet's own signal at 1 s (for example
  `kubectl get --raw /api/v1/nodes/<node>/proxy/stats/summary` in a loop), and see
  whether `memory.availableBytes` dips. If it does, test again with the three
  pulls staggered. A deliberate reproduction is also the verification step of the
  action plan.
- Whether Prometheus should scrape the kubelet and node at a shorter interval
  during deployments, or whether an alert on the kubelet's `MemoryPressure`
  condition (`kube_node_status_condition`) is the right detector, since a 30 s
  scrape cannot see a spike this short.
- Whether the kubelet eviction threshold (250 MiB) should be adjusted on this
  flavor, or whether keeping it and adding capacity is the better answer.

## 9. Lessons

1. **Two tools can disagree about the same resource.** The kernel said 1.3 GiB
   available while the kubelet said 228 MiB, because they count page cache
   differently. Know which signal triggers the action you are investigating, and
   look at that one.
2. **Requests are what the scheduler sees; usage is what the kernel enforces.**
   A cluster can look 57% "full" and be out of memory.
   **Check the quantity the system really acts on** (`memory.available`), not a
   derived percentage: `kubectl top` read 130% while 1.2 GiB were still free.
3. **QoS class decides who dies first.** Declare resources on the thing you
   cannot afford to lose.
4. **A rolling update needs headroom** for one extra pod, and a way to keep the
   old one until the new one is usable.
5. **A good rollout gate is not capacity management.** The PreSync Job protected
   the schema, and nothing protected the node.
6. **A rolling update is only as safe as its readiness probe.** Without one,
   "ready" means "the process started", and the old pod is thrown away too early.
7. **If a human is the alert, you do not have an alert.**
