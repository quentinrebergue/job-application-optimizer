# Load tests: the history

**Ticket:** #49. **Scripts and how to run them:** [`load/README.md`](../../load/README.md).

One line per run and scenario, newest first. The point of the file is the trend: a change that lowers a breaking point,
or moves the bottleneck, shows here. A run goes in when it was clean (no cold-start artefact, the accounts not used up)
and was made on purpose: before opening to a group, after a change of node, image or important limit, or after a change
to a hot path (login, the library, the payload of the renderer).

## How to read a line

- **Asked / reached**: iterations a second the step asked for, and what k6 managed to start and finish. Below the
  breaking point they are equal; past it, "reached" stops rising (the site's capacity) and k6 drops the rest.
- **Last good step**: the highest step below the breaking point, with its p95. It is the figure to compare from one
  run to the next, since the breaking step itself depends on the size of the steps.
- **Breaking point**: the first step whose p95 is over 1 s or whose failures are over 1 %.
- **Bottleneck**: what saturated, from the CPU and memory of the node and the pods, Postgres and nginx (Grafana,
  `kubectl top`). "Not measured" when only the k6 table was looked at.

## Runs

| Date | Commit | Where | Scenario | Last good step (asked / reached, p95) | Breaking point (asked / reached, p95) | Bottleneck | Notes |
|------|--------|-------|----------|---------------------------------------|----------------------------------------|------------|-------|
| 2026-10-12 | `c9e3e70` (deployed) | **The production** (`d2-4`), k6 in Docker on a laptop over a poor home connection | Signed-in reading (50 accounts), 3 runs | 20 / 19.6, 336 ms (best run) | not measurable | The connection of the laptop: the same page took 69 ms then 1,315 ms for `/api/livez`; the server's own time stayed under 0.5 s | **Discarded as a measure of the site.** It showed the site holds at least 20 to 28 page views a second, no more. Led to the network probe and the server's side table |
| 2026-10-12 | `c9e3e70` (deployed) | **The production** (`d2-4`), k6 on a rented `d2-2` instance (floor 15 ms) | Signed-in reading (50 accounts), 20 to 60 / s | 40 / 39.5, 325 ms | 50 / 47.9, 1,394 ms (45 asked: 801 ms, edge); 55: 4.8 s | **The Node thread of the app: 1,059 m, one core full.** Postgres 97 m, nginx 76 m, node 79 %, steal 0 %, pods 1,462 Mi | **About 45 page views a second.** Two runs agree (break between 45 and 50). A second replica should give about +40 % (the node has two cores) |
| 2026-10-12 | `7451b5f` + working tree | Laptop (M1 Pro), production build, k6 in Docker on the same machine | Login (50 accounts) | 3 / 2.8, 314 ms | 4 / 3.6, 1,585 ms | The computation of the hash: bcrypt, 270 ms a login, two at a time | Matches the estimate (3.7 logins a second per core); no failure, k6 dropped 17 iterations |
| 2026-10-12 | `7451b5f` + working tree | same | Autosave | 300 / 281, 184 ms | 400 / 312, 1,370 ms | Not measured (the Node process, one core, shared with k6) | Writes in Postgres on the same machine |
| 2026-10-12 | `7451b5f` + working tree | same | Signed-in reading | 200 / 183, 44 ms | 300 / 224, 2,570 ms | Not measured | `/jobs`, `/resume` and a job page: each reads the database |
| 2026-10-12 | `7451b5f` + working tree | same | Anonymous | 200 / 180, 302 ms | 300 / 200, 3,551 ms | Not measured | Landing, login page, privacy page |

## What the runs on the real node say (2026-10-12)

- **Capacity of ordinary pages: about 45 signed-in page views a second.** At one page every 10 seconds per person
  (reading, then typing), that is **about 450 people active at the same moment**. A class of 30 or a school of 300 is
  inside it. The first figure (24 a second) was a measure of a poor home connection, not of the site: the same server
  answered in under 0.5 s on its side while k6 saw 7 s.
- **The bottleneck is the single Node thread of the app.** At the break it holds 1,059 m (one core), while Postgres is at 97 m,
  nginx at 76 m, the node at 79 % and the steal at 0 %. The app costs about 16 ms of CPU a page view on the node (about 9 ms on
  the laptop). The fix with the best return is a **second replica** (+40 % expected; the node has two cores, memory is
  enough: the app reserves 128 Mi and holds 110 to 193 Mi).
- **A CPU profile of the app (production build, laptop) is flat**: 34 % Node internals, 29 % React/Next render runtime, 18 %
  bundled code, 12 % Next server, 6 % garbage collector; the `pg` driver is under 4 %. Rewriting queries gains little; the
  levers are in the framework's work per page (compression, size of the page, garbage collector). Ticketed in #245.
- **How to measure from a poor connection**: a probe on `/api/livez` once a second ("network p95", which also slows when the
  app is full: not a pure network figure), and the access log of the ingress cut by step ("The server's side"): requests that
  arrived, and the p95 of the app's own time.
- **Not measured yet**: login (bcrypt), autosave and PDF on the production; limits per address (`limits-probe`).

Estimates made on 2026-10-12 before the run, and what became of them: 500 to 1,000 people active at the same time (now
about 240); 1 to 2 logins a second (bcrypt, not measured on the node yet); 4 PDFs at the same instant (the renderer's limit);
about 5,000 AI rankings a month (the cap of 3 EUR).
