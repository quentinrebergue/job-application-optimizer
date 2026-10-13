#!/usr/bin/env bash
# The memory margin of the node, in one command (#260): how much memory can still be used before Kubernetes starts to
# evict pods. Read-only; needs kubectl and python3.
#
#   scripts/node-memory.sh
#
# Two limits are easy to confuse:
#  - the room to SCHEDULE: the sum of the memory *requested* by the pods must stay under the allocatable memory of the node;
#  - the room to USE: the memory the node really has available, minus the threshold under which the kubelet evicts pods
#    (evictionHard memory.available). That is the margin printed here.
set -euo pipefail
node="$(kubectl get nodes -o name | head -1 | cut -d/ -f2)"
summary="$(kubectl get --raw "/api/v1/nodes/${node}/proxy/stats/summary")"
config="$(kubectl get --raw "/api/v1/nodes/${node}/proxy/configz")"
python3 - "$node" <<PY
import json, sys
summary = json.loads('''$summary''')["node"]["memory"]
config = json.loads('''$config''')["kubeletconfig"]
mib = lambda b: round(b / 1048576)
evict = config.get("evictionHard", {}).get("memory.available", "100Mi")
threshold = int(evict.replace("Mi", "")) if evict.endswith("Mi") else 100
available = mib(summary["availableBytes"])
print(f"node {sys.argv[1]}")
print(f"  available to Kubernetes      {available:>6} MiB")
print(f"  eviction threshold           {threshold:>6} MiB  (evictionHard memory.available)")
print(f"  MARGIN before evictions      {available - threshold:>6} MiB")
print(f"  used by the node (working set) {mib(summary['workingSetBytes']):>4} MiB")
margin = available - threshold
print("  -> " + ("above 500 MiB: nothing to free" if margin >= 500 else "UNDER 500 MiB: free some memory (docs/reports/node-memory.md)"))
PY
