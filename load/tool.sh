# Shared by run.sh and seed.sh: the image of the tools, and a way to run a command in it.
# Needs only Docker on the machine that runs the tests.
IMAGE=fastresume-load

ensure_image() {
  if [ -n "${LOAD_REBUILD:-}" ] || ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    echo "Building the image of the load tools ($IMAGE), once..." >&2
    docker build --quiet -t "$IMAGE" "$(dirname "${BASH_SOURCE[0]}")" >/dev/null
  fi
}
