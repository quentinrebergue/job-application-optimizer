#!/usr/bin/env bash
# To run in a second terminal during a load test, on the machine where kubectl works: every 5 seconds it takes the CPU
# and the memory of the pods and of the node (kubectl top) and the CPU of the whole node by kind (/proc/stat: user, system, softirq, steal...), and writes them to
# load/results/observe-<stamp>-samples.txt. It shows one line that updates, nothing more. When it is stopped (Ctrl-C) it
# prints a report: a line a minute and the peaks, and it saves the access log of the ingress for the same length.
# It is the safety when the test runs elsewhere (a rented server has no kubectl): the line turns red above 1800 Mi for
# all the pods together, and rings; stop the test then, past it the kernel starts to stop pods, Postgres included.
#
# To see the figures step by step next to the result of a run (copy the result .json from the machine that ran k6):
#   node load/merge.mjs <result.json> <samples.txt> <access.log>
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p load/results
stamp="$(date +%Y-%m-%d-%H%M%S)"
samples="load/results/observe-${stamp}-samples.txt"
access="load/results/observe-${stamp}-access.log"
started_iso="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# Where the CPU of the node goes, by kind (user, system, softirq: the network...), in cores: what `kubectl top` cannot show,
# since the kernel's own work belongs to no pod.
max_pods_mi="${MAX_PODS_MI:-1800}"

# CPU time used so far by one container, in microseconds, read from its own cgroup. kubectl top is a rate over a minute or so
# that changes about once a minute: too slow to read a steady state of two minutes. The counter is exact and instant; the
# rate between two samples is the CPU used in between.
cgroup_usage() {
  kubectl -n "$1" exec "$2" -- sh -c 'if [ -f /sys/fs/cgroup/cpu.stat ]; then sed -n "s/^usage_usec //p" /sys/fs/cgroup/cpu.stat; else echo $(( $(cat /sys/fs/cgroup/cpuacct/cpuacct.usage) / 1000 )); fi' 2>/dev/null || true
}

report() {
  echo
  kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --since-time="$started_iso" > "$access" 2>/dev/null || : > "$access"
  node load/summary.mjs "$samples"
  echo "Saved: $samples and $access"
  echo "Next to the figures of a run:  node load/merge.mjs <result.json> $samples $access"
  exit 0
}
trap report INT TERM

: > "$samples"
echo "Sampling every 5 s -> $samples. Ctrl-C prints the report." >&2
while true; do
  pods="$(kubectl top pod -A --no-headers 2>/dev/null || true)"
  node_line="$(kubectl top node --no-headers 2>/dev/null || true)"
  # The counters of the CPU of the whole node ("cpu user nice system idle iowait irq softirq steal ..."): /proc/stat seen from
  # a pod is the node's, not the pod's. The difference between two samples says where the CPU went, kind by kind, including
  # what the hypervisor took (steal) and the kernel's own work (system, softirq), which kubectl top cannot show.
  cg_ms="$(python3 -c 'import time; print(int(time.time() * 1000))')"
  cg_app="$(cgroup_usage job-optimizer deploy/app)"
  cg_nginx="$(cgroup_usage ingress-nginx deploy/ingress-nginx-controller)"
  cg_pg="$(cgroup_usage job-optimizer statefulset/postgres)"
  procstat="$(kubectl -n job-optimizer exec deploy/app -- head -1 /proc/stat 2>/dev/null | tr -s ' ' || true)"
  { echo "@@ $(date +%s)"; echo "$pods"; echo "## node"; echo "$node_line"; echo "## procstat"; echo "${procstat:-}"; echo "## cgroups"; echo "ms=${cg_ms} app=${cg_app:-} nginx=${cg_nginx:-} postgres=${cg_pg:-}"; } >> "$samples"
  total="$(echo "$pods" | awk '{ v = $4; if (v ~ /Gi$/) { sub(/Gi$/, "", v); v *= 1024 } else if (v ~ /Ki$/) { sub(/Ki$/, "", v); v /= 1024 } else sub(/Mi$/, "", v); t += v } END { printf "%d", t }')"
  app="$(echo "$pods" | awk '$1 == "job-optimizer" && $2 ~ /^app-/ { print $3 }' | head -1)"
  node_cpu="$(echo "$node_line" | awk '{ print $3 }')"
  if [ "${total:-0}" -gt "$max_pods_mi" ]; then colour=$'\033[1;31m'; bell=$'\a'; else colour=""; bell=""; fi
  printf '\r\033[K%s%s  all pods %s Mi (stop above %s)  app %s  node %s%s' "$colour" "$(date +%T)" "${total:-?}" "$max_pods_mi" "${app:-?}" "${node_cpu:-?}" $'\033[0m'"$bell"
  sleep 5
done
