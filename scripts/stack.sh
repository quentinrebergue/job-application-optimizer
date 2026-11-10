#!/usr/bin/env bash
# The whole stack on this machine, in one command.
#
#   npm run stack                 the database, the migrations and the services in Docker, then the app (next dev)
#   npm run stack -- --docker     the same, with the app in a container too (the production image): only Docker needed
#   npm run stack -- --services   only the database and the services, no app
#   scripts/stack.sh status       what answers, and where
#   scripts/stack.sh seed         a demo account with a small library and a job (demo@example.test)
#   scripts/stack.sh restore FILE a backup (.sql.gz, or .sql.gz.age with the private key) into the local database
#   scripts/stack.sh pull [FILE]  the latest backup of production (the encrypted copy in the OVH bucket) into the local database
#   scripts/stack.sh logs         follow the logs of the services
#   scripts/stack.sh down         stop the services (the data stays)
#   scripts/stack.sh reset        stop them and delete the local database
#
# Everything has a default for a laptop; `.env.local` (made from `.env.example` the first time) overrides it: the ports
# (DB_PORT, RENDERER_PORT, PDF_TEXT_PORT, HASHER_PORT, GATEWAY_PORT, APP_PORT), POSTGRES_PASSWORD, and the AI gateway
# (AI_TOKEN, AI_BASE_URL, AI_MODEL: without a token the gateway is not started and the AI features say they are unavailable).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ENV_FILE=.env.local

die() { echo "stack: $*" >&2; exit 1; }

# A value: the environment, then .env.local, then the default.
val() {
  local key="$1" default="$2" from_env="${!1:-}" from_file=""
  if [ -n "$from_env" ]; then echo "$from_env"; return; fi
  if [ -f "$ENV_FILE" ]; then
    from_file="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' || true)"
  fi
  echo "${from_file:-$default}"
}

ensure_env() {
  if [ ! -f "$ENV_FILE" ]; then
    cp .env.example "$ENV_FILE"
    echo "stack: $ENV_FILE made from .env.example (defaults for this machine)"
  fi
}

need_docker() {
  command -v docker >/dev/null || die "Docker is not installed"
  docker info >/dev/null 2>&1 || die "Docker is not running: start Docker Desktop and try again"
}

dc() { docker compose --env-file "$ENV_FILE" "$@"; }

load_settings() {
  PASSWORD="$(val POSTGRES_PASSWORD change-me)"
  DB_PORT="$(val DB_PORT 5433)"
  RENDERER_PORT="$(val RENDERER_PORT 8090)"
  PDF_TEXT_PORT="$(val PDF_TEXT_PORT 8095)"
  HASHER_PORT="$(val HASHER_PORT 8098)"
  GATEWAY_PORT="$(val GATEWAY_PORT 8099)"
  APP_PORT="$(val APP_PORT 3000)"
  AI_TOKEN_SET="$(val AI_TOKEN '')"
  # The compose file reads these too (from `.env.local` by --env-file, or from the shell for a one-off).
  export DB_PORT RENDERER_PORT PDF_TEXT_PORT HASHER_PORT GATEWAY_PORT APP_PORT
}

wait_http() {
  local name="$1" url="$2" tries=60
  until curl -fsS -o /dev/null "$url" 2>/dev/null; do
    tries=$((tries - 1))
    [ "$tries" -gt 0 ] || die "$name does not answer at $url (docker compose logs $name)"
    sleep 1
  done
  echo "  ok  $name  $url"
}

start_services() {
  local services=(resume-renderer pdf-text password-hasher) profiles=()
  if [ -n "$AI_TOKEN_SET" ]; then
    services+=(ai-gateway)
    profiles+=(--profile ai)
  else
    echo "stack: no AI_TOKEN in $ENV_FILE: the AI gateway is not started (the ranking and the import will say the AI is unavailable)"
  fi

  echo "stack: database"
  dc up -d --wait db
  echo "stack: migrations"
  dc run --rm migrate
  echo "stack: services (the first build takes a few minutes)"
  # `${profiles[@]+...}`: an empty array is an error under `set -u` in the bash 3.2 of macOS.
  dc ${profiles[@]+"${profiles[@]}"} up -d --build "${services[@]}"

  echo "stack: waiting for the services"
  wait_http resume-renderer "http://127.0.0.1:${RENDERER_PORT}/readyz"
  wait_http pdf-text "http://127.0.0.1:${PDF_TEXT_PORT}/readyz"
  wait_http password-hasher "http://127.0.0.1:${HASHER_PORT}/readyz"
  if [ -n "$AI_TOKEN_SET" ]; then wait_http ai-gateway "http://127.0.0.1:${GATEWAY_PORT}/readyz"; fi
}

run_app_on_host() {
  [ -d node_modules ] || { echo "stack: npm ci (first time)"; npm ci; }
  # The environment of the process wins over `.env.local`: the app talks to this stack, whatever the file says.
  export DATABASE_URL="postgres://app:${PASSWORD}@127.0.0.1:${DB_PORT}/job_optimizer"
  export RESUME_RENDERER_URL="http://127.0.0.1:${RENDERER_PORT}"
  export PDF_TEXT_URL="http://127.0.0.1:${PDF_TEXT_PORT}"
  export PASSWORD_HASHER_URL="http://127.0.0.1:${HASHER_PORT}"
  export APP_URL="http://localhost:${APP_PORT}"
  if [ -n "$AI_TOKEN_SET" ]; then export AI_GATEWAY_URL="http://127.0.0.1:${GATEWAY_PORT}"; else unset AI_GATEWAY_URL || true; fi
  echo
  echo "stack: the app on http://localhost:${APP_PORT} (Ctrl-C stops the app; the services keep running: scripts/stack.sh down)"
  exec npx next dev -p "$APP_PORT"
}

run_app_in_docker() {
  local profiles=(--profile app)
  [ -z "$AI_TOKEN_SET" ] || profiles+=(--profile ai)
  echo "stack: the app image (a few minutes the first time)"
  dc "${profiles[@]}" up -d --build app
  wait_http app "http://127.0.0.1:${APP_PORT}/api/healthz"
  echo
  echo "stack: the app on http://localhost:${APP_PORT} (scripts/stack.sh logs, scripts/stack.sh down)"
}

cmd_up() {
  local mode=host
  for arg in "$@"; do
    case "$arg" in
      --docker) mode=docker ;;
      --services) mode=services ;;
      *) die "unknown option $arg (--docker, --services)" ;;
    esac
  done
  need_docker; ensure_env; load_settings
  start_services
  case "$mode" in
    host) run_app_on_host ;;
    docker) run_app_in_docker ;;
    services) echo; echo "stack: the services are up; no app started" ;;
  esac
}

cmd_status() {
  need_docker; ensure_env; load_settings
  dc ps -a
  echo
  for entry in "resume-renderer:${RENDERER_PORT}:/readyz" "pdf-text:${PDF_TEXT_PORT}:/readyz" "password-hasher:${HASHER_PORT}:/readyz" "ai-gateway:${GATEWAY_PORT}:/readyz" "app:${APP_PORT}:/api/healthz"; do
    IFS=: read -r name port path <<<"$entry"
    if curl -fsS -o /dev/null "http://127.0.0.1:${port}${path}" 2>/dev/null; then echo "  ok   $name  http://127.0.0.1:${port}"; else echo "  --   $name  (not answering on ${port})"; fi
  done
  if dc exec -T db pg_isready -U app -d job_optimizer >/dev/null 2>&1; then echo "  ok   database  127.0.0.1:${DB_PORT}"; else echo "  --   database"; fi
}

cmd_seed() {
  need_docker; ensure_env; load_settings
  [ -d node_modules/bcryptjs ] || die "bcryptjs is missing: npm ci"
  dc up -d --wait db
  dc run --rm migrate
  local hash
  hash="$(node -e "process.stdout.write(require('bcryptjs').hashSync('demo-password-1', 12))")"
  dc exec -T db psql -U app -d job_optimizer -v ON_ERROR_STOP=1 -q -v pwhash="$hash" -f - <scripts/demo-seed.sql
  echo "stack: demo account ready: demo@example.test / demo-password-1 (fictional data)"
}

cmd_restore() {
  local file="${1:-}"
  [ -n "$file" ] || die "usage: scripts/stack.sh restore FILE.sql.gz[.age]"
  [ -f "$file" ] || die "$file does not exist"
  need_docker; ensure_env; load_settings
  echo "stack: this REPLACES the local database with the content of $file."
  echo "       A backup of production holds the data of real people: keep it on this machine, for this work only."
  if [ "${STACK_YES:-}" != 1 ]; then
    read -r -p "Type yes to go on: " answer
    [ "$answer" = yes ] || die "cancelled"
  fi
  dc up -d --wait db
  dc exec -T db psql -U app -d postgres -v ON_ERROR_STOP=1 -q \
    -c "DROP DATABASE IF EXISTS job_optimizer WITH (FORCE)" -c "CREATE DATABASE job_optimizer"
  local load=(dc exec -T db psql -U app -d job_optimizer -v ON_ERROR_STOP=1 -q -o /dev/null)
  case "$file" in
    *.sql.gz.age)
      command -v age >/dev/null || die "age is not installed (brew install age)"
      local key="${AGE_KEY:-$HOME/fastresume-backup-age-key.txt}"
      [ -f "$key" ] || die "the private key is not at $key (AGE_KEY=path to change it)"
      age -d -i "$key" "$file" | gunzip | "${load[@]}" ;;
    *.sql.gz) gunzip -c "$file" | "${load[@]}" ;;
    *.sql) "${load[@]}" <"$file" ;;
    *) die "a .sql.gz, .sql.gz.age or .sql file" ;;
  esac
  # A backup older than the code lacks the latest migrations.
  dc run --rm migrate
  echo "stack: database restored"
}

# Downloads the latest encrypted backup from the OVH bucket, decrypts it and loads it: all the steps of the runbook.
# The S3 keys come from RCLONE_S3_ACCESS_KEY_ID / RCLONE_S3_SECRET_ACCESS_KEY, or are asked for (the secret is not echoed);
# they are never written to disk. The download goes to a private temporary folder that is deleted at the end, even on failure.
cmd_pull() {
  local name="${1:-}"
  command -v rclone >/dev/null || die "rclone is not installed (brew install rclone)"
  command -v age >/dev/null || die "age is not installed (brew install age)"
  local bucket="${BACKUP_BUCKET:-fastresume-db-backups}"
  local ak="${RCLONE_S3_ACCESS_KEY_ID:-}" sk="${RCLONE_S3_SECRET_ACCESS_KEY:-}"
  if [ -z "$ak" ]; then read -r -p "S3 access key: " ak; fi
  if [ -z "$sk" ]; then read -r -s -p "S3 secret key (hidden): " sk; echo; fi
  [ -n "$ak" ] && [ -n "$sk" ] || die "both S3 keys are needed (in your password manager)"
  local rc=(env RCLONE_S3_PROVIDER=Other RCLONE_S3_ENDPOINT="${BACKUP_ENDPOINT:-https://s3.rbx.io.cloud.ovh.net}"
    RCLONE_S3_REGION=rbx RCLONE_S3_ACCESS_KEY_ID="$ak" RCLONE_S3_SECRET_ACCESS_KEY="$sk" rclone)
  if [ -z "$name" ]; then
    name="$("${rc[@]}" lsf ":s3:$bucket" | grep '\.sql\.gz\.age$' | sort | tail -n 1)" ||
      die "could not list the bucket (wrong keys, or no policy on the user: 403)"
    [ -n "$name" ] || die "no backup in the bucket $bucket"
  fi
  local tmp; tmp="$(mktemp -d)"
  trap "rm -rf '$tmp'" EXIT # expanded now: $tmp is local and gone when the script exits
  echo "stack: downloading $name"
  "${rc[@]}" copyto ":s3:$bucket/$name" "$tmp/$name" || die "download failed"
  cmd_restore "$tmp/$name"
  echo "stack: the temporary copy is deleted; the data in the local database is real people's: keep it here"
}

cmd_logs() { need_docker; ensure_env; load_settings; dc --profile ai --profile app logs -f --tail 50; }
cmd_down() { need_docker; ensure_env; load_settings; dc --profile ai --profile app down; }

cmd_reset() {
  need_docker; ensure_env; load_settings
  if [ "${STACK_YES:-}" != 1 ]; then
    read -r -p "This deletes the local database. Type yes to go on: " answer
    [ "$answer" = yes ] || die "cancelled"
  fi
  dc --profile ai --profile app down -v
  echo "stack: stopped, local database deleted"
}

case "${1:-up}" in
  up) shift || true; cmd_up "$@" ;;
  status) cmd_status ;;
  seed) cmd_seed ;;
  restore) shift; cmd_restore "${1:-}" ;;
  pull) shift; cmd_pull "${1:-}" ;;
  logs) cmd_logs ;;
  down) cmd_down ;;
  reset) cmd_reset ;;
  --docker | --services) cmd_up "$@" ;;
  -h | --help | help) sed -n '2,18p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' ;;
  *) die "unknown command $1 (up, status, seed, restore, pull, logs, down, reset)" ;;
esac
