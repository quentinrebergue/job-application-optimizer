#!/usr/bin/env bash
# Starts the image the way the pod does and reads real PDFs, to prove that the limits are enough (#266): a read-only file system,
# no capability, a folder for the compilation cache, and the memory in two steps:
#  - the first start compiles pdfium (200 to 235 MB for a few seconds): 384 MB, the limit of the pod (256 MB is not enough: the process is killed);
#  - a restart of the container reads the compiled module from the cache: it must then fit under 128 MB.
#
#   services/pdf-text/smoke.sh <image>        e.g. pdf-text:dev
#
# It checks that the container is not killed for its memory, that it becomes ready, that a resume is read, that what is not a
# PDF and a picture are refused with the right status, and that a restart of the container starts from the cache.
set -euo pipefail
image="${1:?usage: smoke.sh <image>}"
cd "$(dirname "$0")"
data=internal/reader/testdata
name="pdf-text-smoke-$$"
port="${SMOKE_PORT:-18090}"
# The cache is a folder on the disk, as the emptyDir of the pod: a tmpfs would be counted as memory by the container.
cache="$(mktemp -d)"; chmod 777 "$cache"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf "$cache"; }
trap cleanup EXIT

docker run -d --name "$name" --memory=384m --memory-swap=384m --read-only --cap-drop=ALL --security-opt no-new-privileges \
  -v "$cache:/cache" -e CACHE_DIR=/cache -p "$port:8080" "$image" >/dev/null

wait_ready() {
  for _ in $(seq 1 90); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' "localhost:$port/readyz" || true)" = 200 ] && return 0
    [ "$(docker inspect --format '{{.State.Running}}' "$name")" = true ] || { echo "FAIL: the container stopped"; docker logs "$name" | tail -5; return 1; }
    sleep 1
  done
  echo "FAIL: not ready after 90 s"; docker logs "$name" | tail -5; return 1
}
loaded_in() { docker logs "$name" 2>&1 | grep '"msg":"ready"' | tail -1 | sed -n 's/.*"pdfium_loaded_in":"\([^"]*\)".*/\1/p'; }
check() { # description, expected status, file, expected text in the answer
  local code body
  body="$(curl -s -o /tmp/smoke-body.$$ -w '%{http_code}' -X POST --data-binary "@$data/$3" "localhost:$port/extract")"; code="$body"
  if [ "$code" != "$2" ] || ! grep -q "$4" /tmp/smoke-body.$$; then echo "FAIL: $1: got $code, wanted $2 with '$4'"; cat /tmp/smoke-body.$$; exit 1; fi
  echo "ok: $1 ($code)"
}

wait_ready
echo "first start (no cache): ready, pdfium loaded in $(loaded_in)"
check "a one-column resume is read" 200 one-column.pdf "Camille Moreau"
check "two columns are read" 200 two-columns.pdf "Compétences"
check "what is not a PDF is refused" 415 not-a-pdf.txt "not_a_pdf"
check "a picture has no text" 422 picture.pdf "no_text"
check "a damaged PDF is unreadable" 422 truncated.pdf "unreadable"

echo "memory with the work done: $(docker stats --no-stream --format '{{.MemUsage}}' "$name")"
[ "$(docker inspect --format '{{.State.OOMKilled}}' "$name")" = false ] || { echo "FAIL: killed for its memory"; exit 1; }

# The compiled module is in the cache now: the same container, with half the memory, must start and read.
docker update --memory=128m --memory-swap=128m "$name" >/dev/null
docker restart "$name" >/dev/null
wait_ready
echo "restart of the container under 128 MB (the cache is read): pdfium loaded in $(loaded_in)"
check "a resume is read after the restart" 200 one-column.pdf "Camille Moreau"
[ "$(docker inspect --format '{{.State.OOMKilled}}' "$name")" = false ] || { echo "FAIL: killed for its memory after the restart"; exit 1; }
echo "SMOKE OK: started under 384 MB, restarted from the cache and read under 128 MB"
