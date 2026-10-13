# load/

Load tests (#49): how many requests the site takes before it gives way, which part gives way first, and a history to
see whether a change made it better or worse. [k6](https://k6.io) scripts, run by hand from this machine; the
results are kept in [`docs/reports/load-tests.md`](../docs/reports/load-tests.md).

## How a run works

A scenario raises the load **by steps**: every 30 seconds it starts a few more iterations a second (an *arrival
rate*, not a number of users: k6 starts that many whatever the speed of the answers, so a site that slows down shows
it instead of slowing the test down with it). At the end, a table gives each step's requests, p50 and p95 and the
share of failures, and names the **breaking point**: the first step whose p95 is over one second (`SLOW_MS`) or whose
failures are over 1 % (`FAIL_RATE`). The run stops by itself when the site is clearly down (more than 5 % of failures,
or a p95 over 5 seconds): that is the safety, not an error. k6 exits with code 99 when a threshold fails: for a test
that looks for the breaking point, that is the normal end.

## The scenarios

| File | What it does | Default ramp (iterations a second) |
|------|--------------|-------------------------------------|
| `anonymous.js` | The landing, login and privacy pages, nothing signed in. | 5 to 40 |
| `signed-in-read.js` | `/jobs`, `/resume` and a job page: each asks the database. | 5 to 40 |
| `write-autosave.js` | The save of an entry or a job while typing (`PUT`): writes to the test accounts. | 5 to 40 |
| `login.js` | The real login form (its hidden fields, then the post). A login costs a quarter of a second of computation, so this one gives way first. | 5 to 40 |
| `pdf.js` | A resume download: reads the data and asks the renderer. | 5 to 40 |
| `limits-probe.js` | Not a ramp: does the site limit one address, and does it see the visitor's real address? A flood of a cheap page (the edge), then the password-reset and failed-login limits until they refuse, then a forged address header. | one run, about a minute |
| `mixed.js` | What a login costs the pages of everyone else (#254). Not a ramp: `READ_RPS` page reads a second (15) alone for `ALONE_SECONDS` (40), then the same reads plus `LOGIN_RPS` logins a second (1) for `TOGETHER_SECONDS` (80). The answer is the p95 of the reads in the two phases. Needs `LOAD_PASSWORD`. | about 2 minutes |
| `signup.js` | A visitor signing up with the real form (new `loadtest-signup-*` accounts). **Local only**: `run.sh` refuses a real site, where it would create accounts and send a mail to addresses that do not exist. Start the server with no `SMTP_` variable and the sign-up limits raised (`SIGNUPS_PER_IP_PER_HOUR`, `SIGNUPS_PER_IP_PER_DAY`, `SIGNUPS_MAX_PER_DAY`, `SIGNUPS_ALERT_PER_DAY` at 100000), and `PASSWORD_HASHER_URL` to try the service. | 3 to 4 a second |

`lib.js` holds what they share (the ramp, the thresholds, the report, the helpers for the forms), `seed.sh` and `seed.sql`
make the test accounts, `cleanup.sql` removes them, `run.sh` runs a scenario, `Dockerfile` and `tool.sh` make the image
they run in, `observe.sh` and `slow-paths.sh` read the cluster (see "Finding the bottleneck").

**What is not tested, on purpose**
- **The AI ranking.** It costs money and meets the provider's own rate limit. When it is, it will be framed strictly
  (a small ceiling, the kill switch within reach, the monthly cap watched).
- **The creation of jobs and entries**: it has per-user limits (15 jobs and 30 entries an hour) that answer 429 long
  before the site gives way. The save of what exists is what typing sends.

## Run it

```bash
# 1. The accounts (50 of them: see the notes). The password is any password; the login scenario needs the same one.
export LOAD_PASSWORD='something-long-and-random'
load/seed.sh local 50                     # in the database of docker compose; "prod" for the production

# 2. A scenario, against a production build (npm run build, then npx next start -p 3100)
load/run.sh anonymous
BASE_URL=https://fastresume.tech START_RPS=2 STEP_RPS=2 STEPS=6 load/run.sh signed-in-read   # a gentle run

# 3. Afterwards
load/seed.sh cleanup local                # removes the accounts and load/.accounts.json
```

**Only Docker is needed** (plus `kubectl` for `prod`). The scripts run in a container that has everything: k6 and Node with
bcryptjs, built the first time (`LOAD_REBUILD=1` builds it again) from pinned versions. The settings are environment
variables: `BASE_URL` (default `http://localhost:3100`), `START_RPS`, `STEP_RPS`, `STEPS`,
`STEP_SECONDS`, `MAX_VUS` (the ceiling of simultaneous virtual users, 100), `SLOW_MS`, `FAIL_RATE`. The raw result of a
run is written to `load/results/` (not versioned); what is worth keeping goes into the report.

### From a rented server, in one command

A home connection is not a generator: its noise ends up in the figures. Run k6 on a rented machine (Docker, tar and sudo
are all it needs) and everything else from your laptop, in one terminal:

```bash
LOAD_HOST=ubuntu@1.2.3.4 BASE_URL=https://fastresume.tech START_RPS=10 STEP_RPS=5 STEPS=6 load/run.sh signed-in-read
```

The scripts and the accounts are copied there (`load/results` is not), k6 runs there and its output comes back to your
terminal, the cluster is sampled from your laptop with the same safety (over 1800 Mi for all the pods, k6 is stopped over
SSH), then the result is fetched and the table of both views is printed. `LOAD_PASSWORD` (login, mixed) goes through
the standard input of SSH, never in a command line. Ctrl-C stops k6 on the other machine too. A `BASE_URL` on your own
machine is refused: the server cannot reach it.

**What uses the CPU of the node outside the pods**: `NODE_TOP=1` (with the cluster sampled) starts a small pod 45 seconds into
the run (`NODE_TOP_AFTER`) that shares the process space of the node, takes `top` twice, and prints the processes that use
the most CPU at the end of the report (percent of the whole node, 1 % is 20 m on a node of two cores). It shows `kubelet`,
`containerd`, Prometheus, the network of the cluster, which neither `kubectl top` (pods only) nor the counters of the cgroups
can show. The pod is removed afterwards.

## Finding the bottleneck

The breaking point says *when* the site gives way; the bottleneck is *what* gives way first. The method is the same for any
system: for each resource in the chain (the browser, the load balancer, nginx, the Node process, Postgres, the renderer,
the AI), look at three things during a run: how full it is (**utilisation**), whether work waits for it (**saturation**) and
whether it fails (**errors**). The bottleneck is the first resource that is full while the others are not: speeding up
anything else changes nothing, and once it is fixed the next one becomes the bottleneck.

| Where | What to look at | How |
|-------|-----------------|-----|
| Which page is slow | The p95 of each page at the same load | The "By page" table at the end of each run |
| The pods and the node | CPU (a Node process near 1000m is one full thread), memory against the limit (384 Mi for the app) | **Nothing to do**: against the cluster, `run.sh` samples it and prints one table with k6's figures and the cluster's, step by step, and a hint of what is full (see below). `load/observe.sh` shows it live in a second terminal |
| nginx and the paths | The time to answer of each path, over a window | `load/slow-paths.sh 30m` after the run (a path both frequent and slow is where to look) |
| Postgres | Connections in use against the pool (10), slow queries, locks | `kubectl exec ... psql`: `pg_stat_activity`; `pg_stat_statements` once enabled (it needs a setting at the start of Postgres) |
| The Node thread | The lag of the event loop: when it grows, the thread is full | Not exported yet: a metric to add (see the ticket) |
| Inside the code | Which functions the CPU is spent in | A CPU profile of the production build under load: `node --cpu-prof`, opened in Chrome's DevTools or speedscope |
| One query | Whether it reads what it should and how | `EXPLAIN (ANALYZE, BUFFERS)` on the query of a slow page |

**One table, one command.** Against a site in the cluster (`BASE_URL` not local, `kubectl top` working), `run.sh` samples the
cluster every 5 seconds while k6 runs, and at the end `merge.mjs` prints each step with what the site answered (reached per
second, p95, failures) next to the highest CPU and memory of the app, Postgres, nginx and the node during that step,
then says what is full at the step that broke: the Node thread (the app near 1000 m: one core, it cannot use the second),
the node's CPU, the app's memory against its 384 Mi, the memory of all the pods against the ~2,000 Mi the node allows
them, Postgres or the renderer. It is a hint from what is measured: "none is full" means to look elsewhere (the network of
the machine that runs k6, the pool of connections, a limit set in the code). The same sampling is a **safety**: if all the
pods together pass `MAX_PODS_MI` (1800), the run is stopped. `OBSERVE=0` turns it off, `OBSERVE=1` forces it.

**A poor connection on the machine that runs k6.** Two things keep its noise out of the verdict. Every run asks `/api/livez` once a second next to the ramp: the "network p95" column is what the connection adds to every answer, step by step (the pages at the same step minus that is what the server added). And when the cluster is observed, the run also downloads the access log of the ingress for its length and prints "The server's side": requests that really arrived a second, and the p95 of the app's own time, cut by step. App p95 low while k6 p95 climbs = the slowness is on the way, not in the site. "Server got/s" lower than "k6 reached/s" = part of the load never arrived, so the breaking point is above what this connection can push: run from a better network or from a rented server.

Later, the same figures can live in Grafana next to everything else: k6 can write its metrics to Prometheus (remote
write, which needs `enableRemoteWriteReceiver` on the Prometheus of the monitoring chart), and a dashboard then shows the
requests, the p95 and the CPU of the pods on one screen (it is in the ticket).

## Optimising from the figures

The code was written fast, and the figures are what tell where it is worth going back. The rule: **measure, change one thing,
run the same scenario again, keep the change only if the numbers move**. A guess is a hypothesis until a run confirms it,
and the history file is where the before and the after are written. Things the figures already point at, as hypotheses:
the hashing of passwords (a login takes the thread for 270 ms; a native bcrypt or a worker would use the other core and
free the event loop), the number of queries behind a page (the library does four where one might do), and what every page
asks the database before drawing (the session and the user, twice).

## On the production

The test accounts are made **beforehand** (`load/seed.sh prod`): the sign-up limits of one address (30 an hour) would
stop a test that made them itself. Before a run:
1. Choose a quiet hour, and pause the UptimeRobot alert or leave it a note.
2. Start gently (`START_RPS=2 STEP_RPS=2`) and widen only after a clean run. `MAX_VUS` is the ceiling.
3. Keep `kubectl -n job-optimizer top pod` (and the node) open on the side, and Grafana for the CPU and memory of the
   node, the pods and Postgres.
4. Make sure the AI is out of it (`AI_ENABLED` is not touched by these scenarios, and none of them calls it).
5. Afterwards, `load/seed.sh cleanup prod`.

`seed.sh prod` asks you to type `prod` first. `limits-probe` asks you to type `probe` first: it uses up the limits of **your** address on the production (about an hour,
logins and resets from it are refused, nobody else's), and the forged-header check tells whether the site trusts what
a visitor says about its address.

The accounts end in `@loadtest.invalid` (an address that cannot exist),
and their sessions last three hours: harmless if cleanup is forgotten, but do it.

## Notes that change the figures

- **Locally, k6 and the site share one machine.** The breaking point of a local run is lower than the site's own and says
  little about the real node: it is the first line of the history, to compare the node with.
- **Login: use at least 50 accounts.** A login attempt counts against its email until it ends (and a burst of
  attempts on one account is refused above 5): with five accounts the scenario locks them itself, and the failures are
  the limit of the account, not the site. Seeding again clears these counters.
- **PDF: 1,400 downloads an hour at most with 50 accounts** (30 an hour each). Past it, the answers are the per-user
  limit, counted apart and reported as a warning: the figures then say little about the renderer. The renderer itself
  refuses more than 4 PDFs at the same instant (code `busy`): that one counts as a failure, it is what the scenario
  looks for.
- **`Insufficient VUs`** (k6 reaches `MAX_VUS`, 100 by default): when the site slows down, the requests in flight pile up until
  the generator itself caps them. A run that shows it was limited by the generator at its end: raise `MAX_VUS` (300) to be sure.
- **The first step may be slower** (a cold start, an empty cache): run twice before trusting a break at the first step.
- **A run writes**: sessions (login), saved entries and jobs of the test accounts, counters of limits that expire by
  themselves. Nothing else.
