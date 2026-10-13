#!/usr/bin/env bash
# Makes (seed) or removes (cleanup) the test accounts of the load tests, in the database of a target:
#   load/seed.sh local   [count]     the database of docker compose on this machine
#   load/seed.sh prod    [count]     the production database, through kubectl (asks first)
#   load/seed.sh cleanup local|prod
# The password the accounts log in with comes from LOAD_PASSWORD (the same variable the login scenario reads).
# The target needs docker (local) or kubectl (prod); the rest runs in the container of the tools.
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source=load/tool.sh
source ./tool.sh

die() { echo "$*" >&2; exit 1; }

# The psql of the target, reading its input from the standard input.
psql_on() {
  case "$1" in
    local) docker exec -i jobapplicationoptimizer-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -qtA "$@"' sh "${@:2}" ;;
    prod)  kubectl -n job-optimizer exec -i statefulset/postgres -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -qtA "$@"' sh "${@:2}" ;;
    *)     die "the target is local or prod" ;;
  esac
}

confirm_prod() {
  [ "$1" = prod ] || return 0
  echo "This writes in the PRODUCTION database (users @loadtest.invalid, with a library, jobs and sessions)."
  read -r -p "Type 'prod' to go on: " answer
  [ "$answer" = prod ] || die "cancelled"
}

if [ "${1:-}" = cleanup ]; then
  target="${2:-}"; confirm_prod "$target"
  psql_on "$target" -v ON_ERROR_STOP=1 < cleanup.sql
  rm -f .accounts.json
  echo "The test accounts of $target are removed (and load/.accounts.json)."
  exit 0
fi

target="${1:-}"; count="${2:-50}"
[ -n "${LOAD_PASSWORD:-}" ] || die "Set LOAD_PASSWORD (any password; the login scenario uses it too)."
[[ "$count" =~ ^[0-9]+$ ]] && [ "$count" -ge 1 ] && [ "$count" -le 500 ] || die "the count is a number from 1 to 500"
confirm_prod "$target"

# The hash is made in the container of the tools (bcryptjs, cost 12 like the real accounts): no Node needed here.
ensure_image
hash="$(docker run --rm -e LOAD_PASSWORD "$IMAGE" node -e "require('bcryptjs').hash(process.env.LOAD_PASSWORD, 12).then(console.log)")"
psql_on "$target" -v ON_ERROR_STOP=1 -v "pwhash=$hash" -v "count=$count" < seed.sql | tail -n 1 > .accounts.json
echo "$(grep -o '"email"' .accounts.json | wc -l | tr -d ' ') accounts ready in load/.accounts.json (sessions valid 3 hours, the password is LOAD_PASSWORD)"
