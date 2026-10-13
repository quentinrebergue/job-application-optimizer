#!/usr/bin/env bash
# After a run (or any time): which paths the production served the slowest, from the access log of the ingress.
#   load/slow-paths.sh [window]      e.g. load/slow-paths.sh 30m   (default 15m)
# (awk runs with LC_ALL=C: in a French locale it reads "0.025" as 0 and every time comes out as 0 ms.)
# Per path (the query string is dropped): the number of requests, the mean time nginx took to answer ("request") and
# the mean time the app took ("app"), and the slowest request, in milliseconds. A path that is both frequent and slow is
# where an optimisation pays; one that is slow and rare, much less. Request much longer than app: the wait is before the
# app (nginx, a queue of connections); the two close: the time is in the app, and CPU low means it waits (the database).
set -euo pipefail
window="${1:-15m}"
# LOG_FILE=access.log gives a file instead of the cluster (to try the script).
{ if [ -n "${LOG_FILE:-}" ]; then cat "$LOG_FILE"; else kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --since="$window"; fi; } |
  LC_ALL=C awk -F'"' '
    $2 ~ /^[A-Z]+ / {
      split($2, request, " ")
      path = request[2]; sub(/\?.*/, "", path)
      gsub(/[0-9a-f]{8}-[0-9a-f-]{27}/, ":id", path)          # a uuid
      gsub(/\/(job|exp|proj|skill|edu)-[a-z0-9-]+/, "/:id", path)  # the ids of jobs and entries
      n = split($7, rest, " ")                                # after the user agent: length, time, upstream, ..., upstream time
      time = rest[2] * 1000
      app = rest[7] * 1000
      key = request[1] " " path
      count[key]++; total[key] += time; appTotal[key] += app; if (time > max[key]) max[key] = time
    }
    END { for (k in count) printf "%7d  request %6.0f ms  app %6.0f ms  max %7.0f ms  %s\n", count[k], total[k] / count[k], appTotal[k] / count[k], max[k], k }
  ' | sort -k3 -n -r | head -25
