#!/usr/bin/env bash
# The measure of #253 (the static files served without the Node thread): the same four runs before and after the change, so
# that the two can be put side by side.   load/static-files.sh <label>     e.g. before | after
#
#   1, 2  first-time visitors (the page and its ~16 scripts and styles), a ramp, run twice: the noise between two runs
#   3     the same visitors without the files (ASSETS=0): the share of the files
#   4     a steady 10 visitors a second for 2 minutes: the CPU of the app and of nginx for one visit, read at a fixed rate
#
# It uses run.sh, so LOAD_HOST=user@host and BASE_URL work as usual (against the production, from a rented server). It waits
# between the runs for the node to cool down, and prints the lines that matter at the end. The full output of each run is
# in load/results/static-<label>-*.txt.
set -euo pipefail
cd "$(dirname "$0")/.."
label="${1:?usage: load/static-files.sh <label>   (before | after)}"
: "${BASE_URL:?give BASE_URL, e.g. https://fastresume.tech}"
mkdir -p load/results

run() {
  local name="$1"; shift
  echo "=== $label / $name: $* ===" >&2
  env "$@" load/run.sh anonymous 2>&1 | tee "load/results/static-${label}-${name}.txt"
  sleep "${COOL_DOWN:-30}"
}

ramp="START_RPS=5 STEP_RPS=5 STEPS=6 MAX_VUS=500"
run ramp-1 $ramp
run ramp-2 $ramp
run no-files START_RPS=10 STEP_RPS=10 STEPS=6 MAX_VUS=500 ASSETS=0
run plateau START_RPS=10 STEPS=1 STEP_SECONDS=120 MAX_VUS=300

echo
echo "=================== $label: what matters ==================="
for name in ramp-1 ramp-2 no-files; do
  printf '%-9s ' "$name"
  grep -h -E "^Breaking point|^No step broke" "load/results/static-${label}-${name}.txt" | head -1
done
echo "plateau (10 visitors a second, the highest value of the step):"
grep -h -E "^ step \| target/s \| reached/s|^    1 \|" "load/results/static-${label}-plateau.txt" | tail -2
