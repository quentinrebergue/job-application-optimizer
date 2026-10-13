#!/usr/bin/env bash
# The measure of #253 (the static files served without the Node thread): the same four runs before and after the change, so
# that the two can be put side by side.   load/static-files.sh <label>     e.g. before | after
#
#   1, 2  first-time visitors (the page and its ~16 scripts and styles), a ramp, run twice: the noise between two runs
#   3     the same visitors without the files (ASSETS=0): the share of the files
#   4, 5  a steady 10 visitors a second for 2 minutes, twice: the CPU of the app and of nginx for one visit, read at a fixed
#         rate (the mean of the samples), and the noise between two runs. This is the figure the decision rests on: a ramp
#         moves in steps of 5 visitors, too coarse to see a gain of 30 %.
#
# It uses run.sh, so LOAD_HOST=user@host and BASE_URL work as usual (against the production, from a rented server). It waits
# between the runs for the node to cool down, and prints the lines that matter at the end. The full output of each run is
# in load/results/static-<label>-*.txt.
set -euo pipefail
cd "$(dirname "$0")/.."
label="${1:?usage: load/static-files.sh <label>   (before | after)}"
: "${BASE_URL:?give BASE_URL, e.g. https://fastresume.tech}"
mkdir -p load/results

# SKIP="ramp-1 ramp-2" leaves out runs already done (their files stay as they are).
run() {
  local name="$1"; shift
  case " ${SKIP:-} " in *" $name "*) echo "=== $label / $name: skipped ===" >&2; return 0 ;; esac
  echo "=== $label / $name: $* ===" >&2
  # A ramp that breaks makes run.sh answer with an error on purpose (k6 says a threshold was crossed): not a reason to stop.
  env "$@" load/run.sh anonymous 2>&1 | tee "load/results/static-${label}-${name}.txt" || true
  sleep "${COOL_DOWN:-30}"
}

ramp="START_RPS=5 STEP_RPS=5 STEPS=6 MAX_VUS=500"
run ramp-1 $ramp
run ramp-2 $ramp
run no-files START_RPS=10 STEP_RPS=10 STEPS=6 MAX_VUS=500 ASSETS=0
run plateau START_RPS=10 STEPS=1 STEP_SECONDS=120 MAX_VUS=300
run plateau-2 START_RPS=10 STEPS=1 STEP_SECONDS=120 MAX_VUS=300

echo
echo "=================== $label: what matters ==================="
for name in ramp-1 ramp-2 no-files; do
  printf '%-9s ' "$name"
  grep -h -E "^Breaking point|^No step broke" "load/results/static-${label}-${name}.txt" | head -1
done
for name in plateau plateau-2; do
  echo "$name (10 visitors a second):"
  grep -h -E "^Steady state" "load/results/static-${label}-${name}.txt" | sed 's/^/  /'
done
