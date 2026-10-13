#!/usr/bin/env bash
# Runs one scenario of the load tests, in a container with everything installed (k6): load/run.sh <scenario>
#   anonymous | signed-in-read | write-autosave | login | pdf | limits-probe | mixed | signup
#
# Against a site in the cluster (BASE_URL not local, and kubectl able to answer `kubectl top`), the run also
# samples the cluster every 5 seconds and, when it ends, prints one table with both views side by side: what k6 saw
# and the CPU and memory of the app, Postgres, nginx and the node, step by step, with a hint of what is full.
# The same sampling is a safety: if all the pods together hold more than MAX_PODS_MI (1800), the run is stopped
# (above that, the kernel starts to stop pods, Postgres included). OBSERVE=0 turns the sampling off, OBSERVE=1 forces it.
#
# From another machine: LOAD_HOST=ubuntu@1.2.3.4 load/run.sh <scenario> runs k6 on that machine (a rented server, so that the
# figures are not those of a poor home connection) from this one terminal: the scripts are copied there, k6 runs there
# and its output comes back here, the cluster is sampled from here (the safety stops k6 over SSH), and the result is
# fetched and put next to the samples in the same table. The password of the login scenario goes through the standard
# input of SSH, never in a command line. The machine needs Docker, tar and sudo, nothing else.
#
# The settings are read from the environment: BASE_URL (default http://localhost:3100), START_RPS, STEP_RPS, STEPS,
# STEP_SECONDS, MAX_VUS, ACCESS_LOG=0 and SAMPLE_SECONDS (the cost of measuring), NODE_TOP=1 (the processes of the node, in the report), SLOW_MS, FAIL_RATE, LOAD_PASSWORD (login), MAX_PODS_MI, and for limits-probe: CLIENT_IP_HEADER,
# LOGIN_LIMIT, RESET_LIMIT, FLOOD_RPS, FLOOD_SECONDS, and for mixed: READ_RPS, LOGIN_RPS, ALONE_SECONDS, TOGETHER_SECONDS. Read load/README.md before aiming it at the production.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=load/tool.sh
source load/tool.sh
scenario="${1:-}"
[ -f "load/${scenario}.js" ] || { echo "usage: load/run.sh <anonymous|signed-in-read|write-autosave|login|pdf|limits-probe|mixed|signup>" >&2; exit 1; }
mkdir -p load/results

remote=1
[[ "${BASE_URL:-http://localhost}" == http://localhost* ]] && remote=0
load_host="${LOAD_HOST:-}"
# One SSH connection for all the calls of a run (a passphrase is asked once, not four times); it closes by itself.
ssh_opts=(-o ControlMaster=auto -o "ControlPath=/tmp/fastresume-load-%C" -o ControlPersist=600 -o ServerAliveInterval=15)
if [ -n "$load_host" ] && [ "$remote" = 0 ]; then
  echo "LOAD_HOST runs k6 on another machine, which cannot reach a site on this one: give BASE_URL a public address." >&2
  exit 1
fi
# signup creates accounts and tries to send a mail to each: against a real site, to addresses that do not exist (bounces).
if [ "$scenario" = signup ] && [ "$remote" = 1 ]; then
  echo "signup is for a site on this machine only: on a real site it would create accounts and send a mail to addresses that do not exist (see load/signup.js)." >&2
  exit 1
fi
# limits-probe uses up the limits of the address it runs from: it asks first, here. A run on another machine is told
# (LOAD_CONFIRMED) that the question was answered: its standard input is taken by the password.
if [ "$scenario" = limits-probe ] && [ "$remote" = 1 ] && [ -z "${LOAD_CONFIRMED:-}" ]; then
  echo "limits-probe uses up the limits of the address it runs from${load_host:+ ($load_host, not yours)} on ${BASE_URL}: for about an hour, logins and password resets from that address are refused (nobody else's)."
  read -r -p "Type 'probe' to go on: " answer
  [ "$answer" = probe ] || { echo "cancelled" >&2; exit 1; }
fi
ensure_image

stamp="$(date +%Y-%m-%d-%H%M%S)"
# LOAD_RESULT: where the result goes (set by a run started from another machine, which fetches it from there).
result="${LOAD_RESULT:-load/results/${stamp}-${scenario}.json}"
container="fastresume-load-run"
max_pods_mi="${MAX_PODS_MI:-1800}"

args=(-e "RESULT_FILE=$result")
for name in BASE_URL START_RPS STEP_RPS STEPS STEP_SECONDS MAX_VUS SLOW_MS FAIL_RATE LOAD_PASSWORD CLIENT_IP_HEADER LOGIN_LIMIT RESET_LIMIT FLOOD_RPS FLOOD_SECONDS READ_RPS LOGIN_RPS ALONE_SECONDS TOGETHER_SECONDS ASSETS; do
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

# CPU time used so far by one container, in microseconds, read from its own cgroup. kubectl top is a rate over a minute or so
# that changes about once a minute: too slow to read a steady state of two minutes. The counter is exact and instant; the
# rate between two samples is the CPU used in between.
cgroup_usage() {
  kubectl -n "$1" exec "$2" -- sh -c 'if [ -f /sys/fs/cgroup/cpu.stat ]; then sed -n "s/^usage_usec //p" /sys/fs/cgroup/cpu.stat; else echo $(( $(cat /sys/fs/cgroup/cpuacct/cpuacct.usage) / 1000 )); fi' 2>/dev/null || true
}

# The processes of the node that use the CPU most, seen from a small pod that shares the process space of the node
# (hostPID): what neither kubectl top (pods only) nor the counters of the cgroups (three of them) can show. Made during the
# run, NODE_TOP_AFTER seconds in, and written to a file; the pod is removed. Needs nothing on the node.
node_top_file="load/results/${stamp}-${scenario}-node-top.txt"
capture_node_top() {
  local pod="node-top-${stamp//[^0-9]/}"
  {
    kubectl apply -f - >/dev/null <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: ${pod}
  namespace: default
spec:
  hostPID: true
  restartPolicy: Never
  containers:
    - name: top
      image: busybox:1.36
      command: ["sh", "-c"]
      args:
        - |
          top -b -d 5 -n 2 > /tmp/t
          awk '/^Mem:/{f++} f==2' /tmp/t | grep -v '^Mem:\|^CPU:\|^Load\|PID' | sort -k8 -rn | head -14 | cut -c1-110
EOF
    kubectl -n default wait --for=jsonpath='{.status.phase}'=Succeeded "pod/${pod}" --timeout=90s >/dev/null
    kubectl -n default logs "${pod}"
  } > "$node_top_file" 2>&1 || true
  kubectl -n default delete pod "${pod}" --wait=false >/dev/null 2>&1 || true
}

# Stops k6: its container here, or the one on the other machine.
stop_generator() {
  if [ -n "$load_host" ]; then
    ssh -T "${ssh_opts[@]}" -o ConnectTimeout=10 "$load_host" "sudo docker stop $container" >/dev/null 2>&1 || true
  else
    docker stop "$container" >/dev/null 2>&1 || true
  fi
}

# Every 5 seconds: the pods and the node, raw, for merge.mjs; and the safety.
sample_cluster() {
  while true; do
    pods="$(kubectl top pod -A --no-headers 2>/dev/null || true)"
    node="$(kubectl top node --no-headers 2>/dev/null || true)"
    # The counters of the CPU of the whole node ("cpu user nice system idle iowait irq softirq steal ..."): /proc/stat seen from
    # a pod is the node's, not the pod's. The difference between two samples says where the CPU went, kind by kind, including
    # what the hypervisor took (steal) and the kernel's own work (system, softirq), which kubectl top cannot show.
    cg_ms="$(python3 -c 'import time; print(int(time.time() * 1000))')"
    cg_app="$(cgroup_usage job-optimizer deploy/app)"
    cg_nginx="$(cgroup_usage ingress-nginx deploy/ingress-nginx-controller)"
    cg_pg="$(cgroup_usage job-optimizer statefulset/postgres)"
    procstat="$(kubectl -n job-optimizer exec deploy/app -- head -1 /proc/stat 2>/dev/null | tr -s ' ' || true)"
    { echo "@@ $(date +%s)"; echo "$pods"; echo "## node"; echo "$node"; echo "## procstat"; echo "${procstat:-}"; echo "## cgroups"; echo "ms=${cg_ms} app=${cg_app:-} nginx=${cg_nginx:-} postgres=${cg_pg:-}"; } >> "$samples"
    total="$(echo "$pods" | awk '{ v = $4; if (v ~ /Gi$/) { sub(/Gi$/, "", v); v *= 1024 } else if (v ~ /Ki$/) { sub(/Ki$/, "", v); v /= 1024 } else sub(/Mi$/, "", v); t += v } END { printf "%d", t }')"
    if [ "${total:-0}" -gt "$max_pods_mi" ]; then
      echo "STOP: the pods hold ${total} Mi together, over ${max_pods_mi}: the run is stopped." >&2
      stop_generator
      return
    fi
    sleep "${SAMPLE_SECONDS:-5}"
  done
}

if [ "$observe" = 1 ]; then
  echo "Sampling the cluster every 5 s (stop above ${max_pods_mi} Mi for all the pods) -> $samples" >&2
  : > "$samples"
  sample_cluster &
  sampler_pid=$!
fi
# Whatever ends this script (the end of the run, Ctrl-C), the sampling stops, and so does k6 on the other machine.
cleanup() {
  [ -n "$sampler_pid" ] && { kill "$sampler_pid" && wait "$sampler_pid"; } 2>/dev/null || true
  [ -n "${access_pid:-}" ] && { kill "$access_pid" && wait "$access_pid"; } 2>/dev/null || true
  [ -n "$load_host" ] && stop_generator
  return 0
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# The access log of the ingress for the length of the run: what the server saw, with no network of ours in it. It is
# followed while the run goes: Kubernetes rotates a log file at 10 MB, and a run with the page's files (hundreds of
# requests a second) fills that in minutes, so a log read at the end has lost the beginning.
access="load/results/${stamp}-${scenario}-access.log"
started_iso="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
access_pid=""
# ACCESS_LOG=0 leaves the log alone: following it makes kubelet and containerd carry ~145 lines a second, a cost of the
# measure itself (#263).
if [ -n "$sampler_pid" ] && [ "${ACCESS_LOG:-1}" = 1 ]; then
  : > "$access"
  kubectl -n ingress-nginx logs -f deploy/ingress-nginx-controller --since-time="$started_iso" >> "$access" 2>/dev/null &
  access_pid=$!
fi

# The machine that runs k6 has limits too: a generator that is full reports slow answers that the site never gave. Its CPU
# is read every 3 seconds (docker stats: 100 % is one core) and the peak is printed at the end.
gen_cpu="load/results/${stamp}-${scenario}-generator-cpu.txt"
gen_pid=""
if [ -z "$load_host" ]; then
  : > "$gen_cpu"
  ( while true; do { docker stats --no-stream --format '{{.CPUPerc}}' "$container" 2>/dev/null | tr -d '%' >> "$gen_cpu"; } || true; sleep 3; done ) &
  gen_pid=$!
fi

node_top_pid=""
if [ "${NODE_TOP:-0}" = 1 ] && [ "$observe" = 1 ]; then
  ( sleep "${NODE_TOP_AFTER:-45}"; capture_node_top ) &
  node_top_pid=$!
fi

# ---- The run. The scripts are mounted, not copied: a change is taken at once. Results go to load/results here.
set +e
if [ -n "$load_host" ]; then
  # On the other machine: copy the scripts (and the accounts), run the same script there, bring the result back.
  echo "Running on $load_host: copying load/, then $scenario" >&2
  tar -C load --exclude=./results -cf - . | ssh -T "${ssh_opts[@]}" "$load_host" 'mkdir -p load && tar -C load -xf -'
  envs=()
  for name in BASE_URL START_RPS STEP_RPS STEPS STEP_SECONDS MAX_VUS SLOW_MS FAIL_RATE CLIENT_IP_HEADER LOGIN_LIMIT RESET_LIMIT FLOOD_RPS FLOOD_SECONDS READ_RPS LOGIN_RPS ALONE_SECONDS TOGETHER_SECONDS ASSETS; do
    [ -n "${!name:-}" ] && envs+=("$name=$(printf %q "${!name}")")
  done
  # The password comes on the standard input; k6 in its container reads nothing else from it.
  printf '%s\n' "${LOAD_PASSWORD:-}" | ssh -T "${ssh_opts[@]}" "$load_host" \
    "read -r LOAD_PASSWORD; export LOAD_PASSWORD; sudo --preserve-env=LOAD_PASSWORD env -u LOAD_HOST OBSERVE=0 LOAD_CONFIRMED=1 LOAD_RESULT=$(printf %q "$result") ${envs[*]:-} ./load/run.sh $scenario"
  status=$?
  # 99 is k6 saying that a threshold was crossed (a ramp that broke): normal. Another code is a run that did not happen.
  if [ "$status" != 0 ] && [ "$status" != 99 ]; then
    echo "The run on $load_host ended at once with status $status (k6 did not run, or ssh failed): see the lines above." >&2
  fi
  mkdir -p "$(dirname "$result")"
  # limits-probe prints its verdict and writes no result file.
  if [ "$scenario" != limits-probe ]; then
    scp -q "${ssh_opts[@]}" "$load_host:$result" "$result" 2>/dev/null || echo "No result file to bring back from $load_host." >&2
  fi
else
  docker run --rm -i --name "$container" --add-host=host.docker.internal:host-gateway -v "$PWD/load:/load" -w / "${args[@]}" \
    "$IMAGE" k6 run --quiet "/load/${scenario}.js"
  status=$?
fi
set -e

if [ -n "$gen_pid" ]; then
  kill "$gen_pid" 2>/dev/null || true
  wait "$gen_pid" 2>/dev/null || true
  cores="$(docker info --format '{{.NCPU}}' 2>/dev/null || echo 1)"
  peak="$(sort -n "$gen_cpu" | tail -1)"
  if [ -n "$peak" ]; then
    echo "The machine that runs k6: peak CPU ${peak} % of ${cores} cores ($(awk -v p="$peak" -v c="$cores" 'BEGIN { printf "%d", p / c }') % of the machine)."
    awk -v p="$peak" -v c="$cores" 'BEGIN { if (p / c > 70) print "WARNING: the generator was over 70 % busy: the figures above may understate the site (slower answers, dropped iterations). Run from a bigger machine." }'
  fi
fi

if [ -n "$node_top_pid" ]; then
  wait "$node_top_pid" 2>/dev/null || true
  echo
  echo "The processes of the node that used the most CPU during the run (% of the whole node, 1 % = 20 m; $node_top_file):"
  sed 's/^/  /' "$node_top_file" 2>/dev/null || true
fi

if [ -n "$sampler_pid" ]; then
  { kill "$sampler_pid" && wait "$sampler_pid"; } 2>/dev/null || true
  sleep 2 # the last lines of the log
  [ -n "$access_pid" ] && { kill "$access_pid" && wait "$access_pid"; } 2>/dev/null || true
  [ -f "$result" ] && docker run --rm -v "$PWD/load:/load" -w / "$IMAGE" node /load/merge.mjs "/$result" "/$samples" "/$access" || true
fi
exit "$status"
