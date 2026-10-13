# Memory of the node (#260)

Measured on 2026-10-13, production node `app-pool-node-d6f07b` (OVH `d2-4`: 4 GB). Read it again with `scripts/node-memory.sh`.

## Two limits, not one

| Limit | What it is | Now |
|---|---|---|
| **To schedule** | The sum of the memory *requested* by the pods must stay under the allocatable memory of the node (about 2,000 MiB) | 1,282 MiB requested (64 %): room for about **720 MiB of requests** |
| **To use** | The memory the node really has available, minus the threshold under which the kubelet evicts pods | **1,350 - 250 = 1,100 MiB of margin** |

The first is what Kubernetes checks when it places a pod; the second is what protects the node while it runs. They were
confused in the tickets #260, #261 and #110 ("about 600 MB of margin": that was the scheduling room measured on the pods only);
the real margin is 1,100 MiB.

The numbers behind it:

| Value | MiB |
|---|---|
| `availableBytes` (the kubelet's own count of free memory) | 1,350 |
| `evictionHard memory.available` | 250 |
| Working set of the node | 2,466 |
| RSS of the node | 1,549 |
| All the pods together (`kubectl top pod -A`, 23 samples under load) | 1,346 (max 1,374) |
| Reserved by OVH: `kubeReserved` 1,206 + `systemReserved` 384 | 1,590 |

The pods hold about 1,350 MiB; the rest of the working set (about 1,100 MiB) is the system: kernel, kubelet, containerd and
the cache of files.

## Who holds the memory (mean of 23 samples)

| Pod | MiB |
|---|---|
| Prometheus | 255 |
| Argo CD, application controller | 230 |
| `canal` (the network of the cluster, managed by OVH) | 201 |
| The app | 107 |
| Argo CD, repo server | 64 |
| nginx (ingress) | 45 |
| cert-manager (cainjector, controller, webhook) | 39 + 30 + 13 |
| Postgres | 37 |
| Argo CD, server | 36 |
| calico-kube-controllers, metrics-server, prometheus operator | 35, 31, 30 |
| the rest (coredns, kube-proxy, dex, notifications, applicationset...) | each under 25 |

The unused components of Argo CD (dex 23, notifications 18, applicationset 20: 61 MiB) stay: #33 was closed as "won't do"
for a gain of about 5 % of the margin against 34,000 lines of upstream manifest to apply by hand.

## What we plan to add, against the margin

| To add | Real memory | Requested |
|---|---|---|
| A second replica of the app | 110 to 190 MiB | 128 MiB |
| Grafana, always on (it is off today: `scripts/monitoring-profile.sh`) | about 430 MiB | 128 MiB |
| The service for the import of a PDF (#110) | about 50 to 150 MiB | to decide |
| **All of them** | **600 to 770 MiB** | about 400 MiB |

Everything fits in the 1,100 MiB of margin, with 330 to 500 MiB left, and in the 720 MiB of scheduling room. It is not
roomy (a deploy adds a temporary peak: the sync waves of #171 keep it to one rollout at a time), so what matters is to **watch
the margin** rather than to free memory today.

## The rule

| Margin (`scripts/node-memory.sh`) | What to do |
|---|---|
| 500 MiB or more | nothing |
| under 500 MiB | free memory before adding anything: the candidates below |
| under 250 MiB | act now: a rollout could push the node into evictions |

A margin under 500 MiB is also what the alert of #29 (Alertmanager) should fire on, once it exists.

## Candidates, if the margin falls (each one measured before and after, as in #253)

| Candidate | Gain | Cost |
|---|---|---|
| Prometheus: fewer series, a shorter retention (7 d today), a lower scrape rate (already 60 s, #34) | up to 100 to 150 MiB | dashboards and alerts must still work |
| Argo CD controller (230 MiB): scale it to zero between deploys and wake it for a sync | up to 230 MiB | no drift detection while it sleeps; a step added to every deploy |
| Grafana on demand (`scripts/monitoring-profile.sh minimal` / `normal`) | 430 MiB when off | a command to see the dashboards |
| Argo CD's unused components (#33, won't do) | 61 MiB | a hand-applied install |
| `canal` (201 MiB) | none to hope: managed by OVH | |
