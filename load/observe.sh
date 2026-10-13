#!/usr/bin/env bash
# To run in a second terminal during a load test, on the machine where kubectl works: every 5 seconds it takes the CPU
# and the memory of the pods and of the node (kubectl top) and the steal of the CPU (Prometheus), and writes them to
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
prom_service="${PROM_SERVICE:-monitoring-kube-prometheus-prometheus}"
steal_query='sum(rate(node_cpu_seconds_total%7Bmode%3D%22steal%22%7D%5B1m%5D))%2Fsum(rate(node_cpu_seconds_total%5B1m%5D))'
max_pods_mi="${MAX_PODS_MI:-1800}"

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
  steal="$(kubectl get --raw "/api/v1/namespaces/monitoring/services/${prom_service}:9090/proxy/api/v1/query?query=${steal_query}" 2>/dev/null | sed -n 's/.*"value":\[[0-9.]*,"\([0-9.eE+-]*\)"\].*/\1/p' || true)"
  { echo "@@ $(date +%s)"; echo "$pods"; echo "## node"; echo "$node_line"; echo "## steal"; echo "${steal:-}"; } >> "$samples"
  total="$(echo "$pods" | awk '{ v = $4; if (v ~ /Gi$/) { sub(/Gi$/, "", v); v *= 1024 } else if (v ~ /Ki$/) { sub(/Ki$/, "", v); v /= 1024 } else sub(/Mi$/, "", v); t += v } END { printf "%d", t }')"
  app="$(echo "$pods" | awk '$1 == "job-optimizer" && $2 ~ /^app-/ { print $3 }' | head -1)"
  node_cpu="$(echo "$node_line" | awk '{ print $3 }')"
  if [ "${total:-0}" -gt "$max_pods_mi" ]; then colour=$'\033[1;31m'; bell=$'\a'; else colour=""; bell=""; fi
  printf '\r\033[K%s%s  all pods %s Mi (stop above %s)  app %s  node %s%s' "$colour" "$(date +%T)" "${total:-?}" "$max_pods_mi" "${app:-?}" "${node_cpu:-?}" $'\033[0m'"$bell"
  sleep 5
done
