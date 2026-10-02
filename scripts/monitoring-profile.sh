#!/usr/bin/env bash
# Switch the monitoring stack between two profiles.
#
#   scripts/monitoring-profile.sh normal    everything on (values.yaml)
#   scripts/monitoring-profile.sh minimal   Grafana off to save memory
#   scripts/monitoring-profile.sh status    show which profile is running
#
# The profiles are files in k8s/monitoring/, so what runs is what Git says.
# DRY_RUN=1 shows the Helm command without running it.
set -euo pipefail

RELEASE=monitoring
NAMESPACE=monitoring
CHART=prometheus-community/kube-prometheus-stack
CHART_VERSION=91.8.2

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../k8s/monitoring" && pwd)"

usage() {
  sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

current_profile() {
  local replicas
  replicas="$(kubectl get deployment monitoring-grafana -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}')"
  if [ "$replicas" = "0" ]; then echo minimal; else echo normal; fi
}

apply_profile() {
  local profile="$1"
  local cmd=(helm upgrade "$RELEASE" "$CHART"
    --namespace "$NAMESPACE" --version "$CHART_VERSION"
    -f "$dir/values.yaml")
  if [ "$profile" = minimal ]; then
    cmd+=(-f "$dir/values-minimal.yaml")
  fi
  # --atomic rolls the release back if the upgrade fails or times out.
  cmd+=(--atomic --wait --timeout 5m)
  if [ "${DRY_RUN:-0}" = 1 ]; then
    echo "DRY_RUN=1, would run:"
    printf '  %s\n' "${cmd[*]}"
    return 0
  fi
  "${cmd[@]}"
}

for tool in kubectl helm; do
  command -v "$tool" >/dev/null || { echo "$tool is not installed" >&2; exit 1; }
done

case "${1:-}" in
  status)
    echo "monitoring profile: $(current_profile)"
    ;;
  normal | minimal)
    profile="$1"
    if [ "$(current_profile)" = "$profile" ] && [ "${DRY_RUN:-0}" != 1 ]; then
      echo "already in the $profile profile, nothing to do"
      exit 0
    fi
    echo "switching to the $profile profile..."
    apply_profile "$profile"
    if [ "${DRY_RUN:-0}" != 1 ]; then
      echo "monitoring profile: $(current_profile)"
    fi
    ;;
  *)
    usage
    exit 2
    ;;
esac
