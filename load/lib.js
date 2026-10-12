// What the scenarios of the load tests share (see README.md).
//
// A scenario raises the load by steps (requests started per second) until the site gives way, and the report says
// at which step. The load is an *arrival rate*, not a number of users: k6 starts that many iterations a second
// whatever the answers' speed, so a site that slows down is seen as such instead of slowing the test with it.
import exec from 'k6/execution'
import http from 'k6/http'
import { Rate } from 'k6/metrics'

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3100').replace(/\/$/, '')

// The shape of the ramp. The defaults are gentle (5, 10, ... 40 requests a second, 30 seconds a step): widen them
// only once the small run is clean, and never on the production without having read the README.
export const START_RPS = Number(__ENV.START_RPS || 5)
export const STEP_RPS = Number(__ENV.STEP_RPS || 5)
export const STEPS = Number(__ENV.STEPS || 8)
export const STEP_SECONDS = Number(__ENV.STEP_SECONDS || 30)
export const MAX_VUS = Number(__ENV.MAX_VUS || 100)

// The p95 over which a step counts as broken, and the share of answers that may fail.
const SLOW_MS = Number(__ENV.SLOW_MS || 1000)
const FAIL_RATE = Number(__ENV.FAIL_RATE || 0.01)

/** What a scenario counts as a failure: a wrong status or a page that is not the one asked for. */
export const failures = new Rate('failures')

/** The k6 scenario: a ramp in steps, each one a rise of 5 seconds and a plateau for the rest of it. */
export function ramp(execName = 'default') {
  const stages = []
  for (let i = 0; i < STEPS; i++) {
    const target = START_RPS + i * STEP_RPS
    stages.push({ target, duration: '5s' }, { target, duration: `${Math.max(1, STEP_SECONDS - 5)}s` })
  }
  return {
    executor: 'ramping-arrival-rate',
    startRate: START_RPS,
    timeUnit: '1s',
    preAllocatedVUs: Math.min(20, MAX_VUS),
    maxVUs: MAX_VUS,
    stages,
    exec: execName,
  }
}

/**
 * A request a second to /api/livez for the whole run, next to the ramp (no database: the network and nothing else).
 * Its time, step by step, is what the machine that runs k6 and its connection add to every answer, so a step where it
 * jumps is a step where the figures of the pages say nothing about the site. Tagged `at`, not `step`, so that it
 * counts neither in the requests of a step nor in its p95.
 */
export function probeScenario() {
  return { network: { executor: 'constant-arrival-rate', rate: 1, timeUnit: '1s', duration: `${STEPS * STEP_SECONDS}s`, preAllocatedVUs: 2, maxVUs: 5, exec: 'probe' } }
}
export function probe() {
  http.get(`${BASE_URL}/api/livez`, { redirects: 0, tags: { name: 'floor', step: 'probe', at: String(stepNow()) }, jar: new http.CookieJar() })
}

/** The step the test is in (0, 1, 2...), from the time since the scenario started. */
export function stepNow() {
  return Math.min(STEPS - 1, Math.floor((Date.now() - exec.scenario.startTime) / (STEP_SECONDS * 1000)))
}

/**
 * The thresholds: one per step (that is how the report finds the first step that broke), and two global ones that
 * stop the run for good when the site is clearly down, so a test never keeps hitting something already on its knees.
 */
export function thresholds(names = []) {
  const t = {
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '10s' }],
    http_req_duration: [{ threshold: 'p(95)<5000', abortOnFail: true, delayAbortEval: '10s' }],
  }
  for (let i = 0; i < STEPS; i++) {
    t[`http_req_duration{step:${i}}`] = [`p(95)<${SLOW_MS}`]
    t[`failures{step:${i}}`] = [`rate<${FAIL_RATE}`]
    t[`http_reqs{step:${i}}`] = ['count>=0'] // makes the number of requests of the step appear in the report
    t[`http_req_duration{name:floor,at:${i}}`] = ['p(95)<3600000'] // the network probe, step by step
  }
  // One per page, that never fails: it makes the figures of each page appear in the report.
  for (const name of ['floor', ...names]) {
    t[`http_req_duration{name:${name}}`] = ['p(95)<3600000']
    t[`http_reqs{name:${name}}`] = ['count>=0']
  }
  return t
}

/**
 * The floor of the figures, measured at the start of a run (k6's `setup`): ten requests to /api/livez, a page that asks
 * nothing of the database. Whatever the machine that runs k6 is far from the site, its answer takes at least that long:
 * the time of a page minus this is what the server added. Without it, a p50 of 220 ms against the production cannot be
 * told from a slow server or a distant laptop.
 */
export function floor() {
  for (let i = 0; i < 10; i++) {
    http.get(`${BASE_URL}/api/livez`, { redirects: 0, tags: { name: 'floor', step: 'setup' }, jar: new http.CookieJar() })
  }
}

/** Notes a request: whether it is a failure, tagged with the step. */
export function record(ok) {
  failures.add(!ok, { step: String(stepNow()) })
}

/** The tags of a request: its step and the name of the page (so the report is not one line per address). */
export function tags(name) {
  return { step: String(stepNow()), name }
}

/**
 * A page of the app for a signed-in user: a 200 of some size that is not the login page. Not a text of the interface,
 * which changes with the design (a check on "Job Tracker" went stale and counted 70 % of good pages as failed).
 */
export function isAppPage(res) {
  const body = String(res.body)
  return res.status === 200 && body.length > 5000 && !body.includes('name="password"')
}

/** The accounts made by seed.sh. */
export function loadAccounts(raw) {
  const users = JSON.parse(raw).users
  if (!users || users.length === 0) throw new Error('load/.accounts.json has no account: run load/seed.sh first')
  return users
}

/** The user of this iteration: one after the other, so the load is spread over all the accounts. */
export function pickUser(users) {
  return users[exec.scenario.iterationInTest % users.length]
}

/** No shared cookie between requests: each one carries exactly the session it is given. */
export function authHeaders(user, json = false) {
  const headers = { Cookie: `session=${user.session}` }
  if (json) {
    // The origin check of the API (a request that changes data must come from the site itself).
    headers['Content-Type'] = 'application/json'
    headers.Origin = BASE_URL
  }
  return headers
}

export function getPage(path, name, headers = {}) {
  return http.get(`${BASE_URL}${path}`, { headers, redirects: 0, tags: tags(name), jar: new http.CookieJar() })
}

/** One line per step, and the first one that broke: the breaking point of the run. */
export function report(title, data, { requestsPerIteration = 1, names = [] } = {}) {
  const m = data.metrics
  const value = (name, stat) => (m[name] && m[name].values && m[name].values[stat] !== undefined ? m[name].values[stat] : undefined)
  const rows = []
  let broken = null
  for (let i = 0; i < STEPS; i++) {
    const requests = value(`http_reqs{step:${i}}`, 'count')
    if (!requests) continue
    const p95 = value(`http_req_duration{step:${i}}`, 'p(95)')
    const row = {
      step: i + 1,
      target_rps: START_RPS + i * STEP_RPS,
      requests,
      achieved_rps: Math.round((requests / requestsPerIteration / STEP_SECONDS) * 10) / 10,
      p50_ms: Math.round(value(`http_req_duration{step:${i}}`, 'med') || 0),
      p95_ms: Math.round(p95 || 0),
      failed_percent: Math.round((value(`failures{step:${i}}`, 'rate') || 0) * 1000) / 10,
      floor_p95_ms: Math.round(value(`http_req_duration{name:floor,at:${i}}`, 'p(95)') || 0),
    }
    row.broken = row.p95_ms >= SLOW_MS || row.failed_percent >= FAIL_RATE * 100
    if (row.broken && !broken) broken = row
    rows.push(row)
  }
  // By page, over the whole run: the page that is slowest is where to look first.
  const pages = ['floor', ...names]
    .map((name) => ({ name, p50: Math.round(value(`http_req_duration{name:${name}}`, 'med') || 0), p95: Math.round(value(`http_req_duration{name:${name}}`, 'p(95)') || 0), max: Math.round(value(`http_req_duration{name:${name}}`, 'max') || 0), count: value(`http_reqs{name:${name}}`, 'count') || 0 }))
    .filter((p) => p.count > 0)
  const total = rows.reduce((sum, r) => sum + r.requests, 0)
  const refused = value('quota_refused', 'count') || 0
  const pad = (v, n) => String(v).padStart(n)
  const lines = [
    '',
    `${title} on ${BASE_URL}`,
    `target/s and reached/s are iterations a second${requestsPerIteration > 1 ? ` (${requestsPerIteration} requests each)` : ' (one request each)'}`,
    `ramp: ${START_RPS} to ${START_RPS + (STEPS - 1) * STEP_RPS} requests a second, ${STEPS} steps of ${STEP_SECONDS} s; broken = p95 >= ${SLOW_MS} ms or failures >= ${FAIL_RATE * 100} %`,
    '',
    ' step | target/s | requests | reached/s |  p50 ms |  p95 ms | failed % | network p95 ms',
    '------+----------+----------+-----------+---------+---------+----------+---------------',
    ...rows.map((r) => ` ${pad(r.step, 4)} | ${pad(r.target_rps, 8)} | ${pad(r.requests, 8)} | ${pad(r.achieved_rps, 9)} | ${pad(r.p50_ms, 7)} | ${pad(r.p95_ms, 7)} | ${pad(r.failed_percent, 8)} | ${pad(r.floor_p95_ms || '-', 14)}${r.broken ? '  <- broken' : ''}`),
    '',
    broken
      ? `Breaking point: step ${broken.step}, ${broken.target_rps} requests a second asked (${broken.achieved_rps} reached), p95 ${broken.p95_ms} ms, ${broken.failed_percent} % failed.`
      : 'No step broke: raise START_RPS, STEP_RPS or STEPS and run again.',
    'network p95 = /api/livez asked once a second during the step (no database): what the machine that runs k6 and its connection add to every answer. If it jumps where the pages jump, the step says nothing about the site.',
    pages.length > 0 ? 'By page, over the whole run (floor = /api/livez, no database: the network and nothing else; a page minus the floor is what the server added):' : '',
    ...pages.map((p) => `  ${p.name.padEnd(14)} ${pad(p.count, 7)} requests | p50 ${pad(p.p50, 5)} ms | p95 ${pad(p.p95, 5)} ms | max ${pad(p.max, 6)} ms`),
    pages.length > 0 ? '' : '',
    'Where the time of a request went, whole run (waiting = the server thinking; the others happen before or after it, on the way):',
    ...[['blocked', 'http_req_blocked', 'waiting for a free connection on the k6 side'], ['connecting', 'http_req_connecting', 'opening the TCP connection'], ['tls', 'http_req_tls_handshaking', 'TLS handshake'], ['waiting', 'http_req_waiting', 'first byte: the server'], ['receiving', 'http_req_receiving', 'downloading the answer']].map(
      ([label, metric, what]) => `  ${label.padEnd(11)} p50 ${pad(Math.round(value(metric, 'med') || 0), 5)} ms | p95 ${pad(Math.round(value(metric, 'p(95)') || 0), 5)} ms | max ${pad(Math.round(value(metric, 'max') || 0), 6)} ms  (${what})`,
    ),
    '',
    `Dropped iterations (k6 could not start them in time): ${value('dropped_iterations', 'count') || 0}`,
    value('quota_refused', 'count') !== undefined ? `Refused by a per-user limit (not counted as failures): ${value('quota_refused', 'count')}` : '',
    refused > 0.2 * (refused + total)
      ? 'WARNING: most answers were refusals by a per-user limit, quick ones: the test accounts are used up and the figures above say little about the site. Seed more accounts (load/seed.sh) or wait an hour.'
      : '',
    '',
  ]
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const file = __ENV.RESULT_FILE || `load/results/${stamp}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
  const json = { title, base_url: BASE_URL, date: new Date().toISOString(), started_at: Date.now() - (data.state ? data.state.testRunDurationMs : 0), ramp: { START_RPS, STEP_RPS, STEPS, STEP_SECONDS, SLOW_MS, FAIL_RATE }, steps: rows, pages, breaking_point: broken }
  return { stdout: lines.join('\n'), [file]: JSON.stringify(json, null, 2) }
}

// ---- The forms of the app are Server Actions: a page is read for the hidden fields of its form, then the form is sent.

const unescapeHtml = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'")

/** The hidden fields of the first form of a page (the identifier of the server action, its key...): [name, value]. */
export function hiddenFields(html) {
  const form = /<form[^>]*>([\s\S]*?)<\/form>/.exec(html)
  if (!form) return []
  const fields = []
  const re = /<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?/g
  let m
  while ((m = re.exec(form[1]))) fields.push([unescapeHtml(m[1]), unescapeHtml(m[2] || '')])
  return fields
}

/** A multipart/form-data body, written by hand: k6 sends urlencoded unless a file is attached. */
export function multipart(fields) {
  const boundary = `----k6${Math.random().toString(16).slice(2)}`
  const body = fields.map(([name, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`).join('') + `--${boundary}--\r\n`
  return { body, type: `multipart/form-data; boundary=${boundary}` }
}
