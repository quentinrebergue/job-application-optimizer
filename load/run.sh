#!/usr/bin/env bash
# Runs one scenario of the load tests, in a container with everything installed (k6): load/run.sh <scenario>
#   anonymous | signed-in-read | write-autosave | login | pdf | limits-probe
#
# Against a site in the cluster (BASE_URL not local, and kubectl able to answer `kubectl top`), the run also
# samples the cluster every 5 seconds and, when it ends, prints one table with both views side by side: what k6 saw
# and the CPU and memory of the app, Postgres, nginx and the node, step by step, with a hint of what is full.
# The same sampling is a safety: if all the pods together hold more than MAX_PODS_MI (1800), the run is stopped
# (above that, the kernel starts to stop pods, Postgres included). OBSERVE=0 turns the sampling off, OBSERVE=1 forces it.
#
# The settings are read from the environment: BASE_URL (default http://localhost:3100), START_RPS, STEP_RPS, STEPS,
# STEP_SECONDS, MAX_VUS, SLOW_MS, FAIL_RATE, LOAD_PASSWORD (login), MAX_PODS_MI, and for limits-probe: CLIENT_IP_HEADER,
# LOGIN_LIMIT, RESET_LIMIT, FLOOD_RPS, FLOOD_SECONDS. Read load/README.md before aiming it at the production.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=load/tool.sh
source load/tool.sh
scenario="${1:-}"
[ -f "load/${scenario}.js" ] || { echo "usage: load/run.sh <anonymous|signed-in-read|write-autosave|login|pdf|limits-probe>" >&2; exit 1; }
mkdir -p load/results

remote=1
[[ "${BASE_URL:-http://localhost}" == http://localhost* ]] && remote=0
if [ "$scenario" = limits-probe ] && [ "$remote" = 1 ]; then
  echo "limits-probe uses up the limits of THIS machine's address on ${BASE_URL}: for about an hour, logins and password resets from it are refused (nobody else's)."
  read -r -p "Type 'probe' to go on: " answer
  [ "$answer" = probe ] || { echo "cancelled" >&2; exit 1; }
fi
ensure_image

stamp="$(date +%Y-%m-%d-%H%M%S)"
result="load/results/${stamp}-${scenario}.json"
container="fastresume-load-run"
max_pods_mi="${MAX_PODS_MI:-1800}"
# The share of CPU time the hypervisor takes from the node ("steal"), asked to the Prometheus of the cluster through the
# API server: no port-forward. It is how a shared vCPU shows: the pods look idle and the answers are slow.
prom_service="${PROM_SERVICE:-monitoring-kube-prometheus-prometheus}"
steal_query='sum(rate(node_cpu_seconds_total%7Bmode%3D%22steal%22%7D%5B1m%5D))%2Fsum(rate(node_cpu_seconds_total%5B1m%5D))'

args=(-e "RESULT_FILE=$result")
for name in BASE_URL START_RPS STEP_RPS STEPS STEP_SECONDS MAX_VUS SLOW_MS FAIL_RATE LOAD_PASSWORD CLIENT_IP_HEADER LOGIN_LIMIT RESET_LIMIT FLOOD_RPS FLOOD_SECONDS; do
  [ -n "${!name:-}" ] && args+=(-e "$name=${!name}")
done
# In the container, "localhost" is the container itself: the site on this machine is host.docker.internal.
for i in "${!args[@]}"; do
  args[$i]="${args[$i]/BASE_URL=http:\/\/localhost/BASE_URL=http://host.docker.internal}"
done
[ -n "${BASE_URL:-}" ] || args+=(-e BASE_URL=http://host.docker.internal:3100)

# ---- The sampling of the cluster.
observe="${OBSERVE:-auto}"
if [ "$observe" = auto ]; then
  if [ "$remote" = 1 ] && [ "$scenario" != limits-probe ] && kubectl top node >/dev/null 2>&1; then observe=1; else observe=0; fi
fi
samples="load/results/${stamp}-${scenario}-samples.txt"
sampler_pid=""

# Every 5 seconds: the pods and the node, raw, for merge.mjs; and the safety.
sample_cluster() {
  while true; do
    pods="$(kubectl top pod -A --no-headers 2>/dev/null || true)"
    node="$(kubectl top node --no-headers 2>/dev/null || true)"
    steal="$(kubectl get --raw "/api/v1/namespaces/monitoring/services/${prom_service}:9090/proxy/api/v1/query?query=${steal_query}" 2>/dev/null | sed -n 's/.*"value":\[[0-9.]*,"\([0-9.eE+-]*\)"\].*/\1/p' || true)"
    { echo "@@ $(date +%s)"; echo "$pods"; echo "## node"; echo "$node"; echo "## steal"; echo "${steal:-}"; } >> "$samples"
    total="$(echo "$pods" | awk '{ v = $4; if (v ~ /Gi$/) { sub(/Gi$/, "", v); v *= 1024 } else if (v ~ /Ki$/) { sub(/Ki$/, "", v); v /= 1024 } else sub(/Mi$/, "", v); t += v } END { printf "%d", t }')"
    if [ "${total:-0}" -gt "$max_pods_mi" ]; then
      echo "STOP: the pods hold ${total} Mi together, over ${max_pods_mi}: the run is stopped." >&2
      docker stop "$container" >/dev/null 2>&1 || true
      return
    fi
    sleep 5
  done
}

if [ "$observe" = 1 ]; then
  echo "Sampling the cluster every 5 s (stop above ${max_pods_mi} Mi for all the pods) -> $samples" >&2
  : > "$samples"
  sample_cluster &
  sampler_pid=$!
  trap '[ -n "$sampler_pid" ] && { kill "$sampler_pid" && wait "$sampler_pid"; } 2>/dev/null || true' EXIT
fi

# The access log of the ingress for the length of the run: what the server saw, with no network of ours in it.
access="load/results/${stamp}-${scenario}-access.log"
started_iso="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ---- The run. The scripts are mounted, not copied: a change is taken at once. Results go to load/results here.
set +e
docker run --rm -i --name "$container" --add-host=host.docker.internal:host-gateway -v "$PWD/load:/load" -w / "${args[@]}" \
  "$IMAGE" k6 run --quiet "/load/${scenario}.js"
status=$?
set -e

if [ -n "$sampler_pid" ]; then
  { kill "$sampler_pid" && wait "$sampler_pid"; } 2>/dev/null || true
  kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --since-time="$started_iso" > "$access" 2>/dev/null || : > "$access"
  [ -f "$result" ] && docker run --rm -v "$PWD/load:/load" -w / "$IMAGE" node /load/merge.mjs "/$result" "/$samples" "/$access" || true
fi
exit "$status"
