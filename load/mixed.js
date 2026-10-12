// Pages read while people log in: what a login costs the pages of everyone else (#254). In one run, so that both
// figures come from the same server in the same minutes:
//   - the first ALONE_SECONDS: only reads (READ_RPS a second), the figure to compare with;
//   - then TOGETHER_SECONDS: the same reads and, on top, LOGIN_RPS logins a second.
// The answer is the p95 of the reads in the two phases. A login costs a quarter to half a second of CPU; if it is
// done on the thread that serves the pages, the reads of the second phase are slower.
// Needs the accounts of load/seed.sh and the same LOAD_PASSWORD (`-e LOAD_PASSWORD=...`).
import http from 'k6/http'
import exec from 'k6/execution'
import { check } from 'k6'
import { Rate } from 'k6/metrics'
import { SharedArray } from 'k6/data'
import { BASE_URL, MAX_VUS, authHeaders, isAppPage, hiddenFields, loadAccounts, multipart, floor } from './lib.js'

const READ_RPS = Number(__ENV.READ_RPS || 15)
const LOGIN_RPS = Number(__ENV.LOGIN_RPS || 1)
const ALONE_SECONDS = Number(__ENV.ALONE_SECONDS || 40)
const TOGETHER_SECONDS = Number(__ENV.TOGETHER_SECONDS || 80)
const PASSWORD = __ENV.LOAD_PASSWORD

const phases = ['alone', 'with-logins']
const failed = new Rate('mixed_failed')
let readNotes = 0

export const options = {
  scenarios: {
    reading: { executor: 'constant-arrival-rate', rate: READ_RPS, timeUnit: '1s', duration: `${ALONE_SECONDS + TOGETHER_SECONDS}s`, preAllocatedVUs: 20, maxVUs: MAX_VUS, exec: 'read' },
    logins: { executor: 'constant-arrival-rate', rate: LOGIN_RPS, timeUnit: '1s', startTime: `${ALONE_SECONDS}s`, duration: `${TOGETHER_SECONDS}s`, preAllocatedVUs: 5, maxVUs: Math.min(MAX_VUS, 100), exec: 'login' },
  },
  thresholds: {
    // The run stops by itself when the pages are clearly down. Only the reads are watched for time: the logins are
    // meant to be pushed past what the service can do (they wait, and may take seconds), the pages must not follow.
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '10s' }],
    'http_req_duration{name:read}': [{ threshold: 'p(95)<5000', abortOnFail: true, delayAbortEval: '10s' }],
    // Never failing ones, that make the figures of each phase appear in the summary.
    ...Object.fromEntries(phases.flatMap((phase) => [[`http_req_duration{name:read,phase:${phase}}`, ['p(95)<3600000']], [`http_reqs{name:read,phase:${phase}}`, ['count>=0']], [`mixed_failed{name:read,phase:${phase}}`, ['rate<=1']]])),
    'http_req_duration{name:login}': ['p(95)<3600000'],
    'http_reqs{name:login}': ['count>=0'],
    'mixed_failed{name:login}': ['rate<=1'],
  },
}

const users = new SharedArray('users', () => loadAccounts(open('./.accounts.json')))

const phaseNow = () => (exec.instance.currentTestRunDuration < ALONE_SECONDS * 1000 ? 'alone' : 'with-logins')

export function read() {
  const user = users[exec.scenario.iterationInTest % users.length]
  const roll = Math.random()
  const page = roll < 0.5 ? { path: '/jobs' } : roll < 0.8 ? { path: '/resume' } : { path: `/jobs/${user.jobs[0]}` }
  const phase = phaseNow()
  const res = http.get(`${BASE_URL}${page.path}`, { headers: authHeaders(user), redirects: 0, tags: { name: 'read', phase }, jar: new http.CookieJar() })
  const good = check(res, { 'the page is a page of the app': isAppPage })
  if (!good && readNotes < 3) {
    // Why a page is counted as failed, for the first few.
    readNotes++
    const body = String(res.body)
    const title = (body.match(/<title>([^<]{0,60})/) || [])[1]
    console.warn(`read failed: ${page.path} status ${res.status}, ${body.length} bytes, title "${title}"`)
  }
  failed.add(!good, { name: 'read', phase })
}

export function login() {
  if (!PASSWORD) throw new Error('Give the password of the test accounts: -e LOAD_PASSWORD=...')
  const user = users[exec.scenario.iterationInTest % users.length]
  const jar = new http.CookieJar()
  const page = http.get(`${BASE_URL}/login`, { redirects: 0, tags: { name: 'login-page' }, jar })
  const form = multipart([...hiddenFields(String(page.body)), ['email', user.email], ['password', PASSWORD]])
  const res = http.post(`${BASE_URL}/login`, form.body, { headers: { 'Content-Type': form.type, Origin: BASE_URL }, redirects: 0, tags: { name: 'login' }, jar })
  failed.add(!check(res, { 'the login redirects (303)': (r) => r.status === 303 }), { name: 'login' })
}

export function setup() {
  floor()
}

export function handleSummary(data) {
  const m = data.metrics
  const value = (name, stat) => (m[name] && m[name].values && m[name].values[stat] !== undefined ? m[name].values[stat] : undefined)
  const pad = (v, n) => String(v).padStart(n)
  const seconds = { alone: ALONE_SECONDS, 'with-logins': TOGETHER_SECONDS }
  const rows = phases.map((phase) => {
    const key = `{name:read,phase:${phase}}`
    const count = value(`http_reqs${key}`, 'count') || 0
    return { phase, per_second: Math.round((count / seconds[phase]) * 10) / 10, p50: Math.round(value(`http_req_duration${key}`, 'med') || 0), p95: Math.round(value(`http_req_duration${key}`, 'p(95)') || 0), max: Math.round(value(`http_req_duration${key}`, 'max') || 0), failed_percent: Math.round((value(`mixed_failed${key}`, 'rate') || 0) * 1000) / 10 }
  })
  const logins = value('http_reqs{name:login}', 'count') || 0
  const login = { per_second: Math.round((logins / TOGETHER_SECONDS) * 10) / 10, p50: Math.round(value('http_req_duration{name:login}', 'med') || 0), p95: Math.round(value('http_req_duration{name:login}', 'p(95)') || 0), failed_percent: Math.round((value('mixed_failed{name:login}', 'rate') || 0) * 1000) / 10 }
  const [alone, together] = rows
  const lines = [
    '',
    `pages read while people log in, on ${BASE_URL}`,
    `${READ_RPS} page reads a second for ${ALONE_SECONDS} s alone, then ${TOGETHER_SECONDS} s with ${LOGIN_RPS} logins a second`,
    '',
    ' phase          | reads/s | p50 ms | p95 ms | max ms | failed %',
    '----------------+---------+--------+--------+--------+---------',
    ...rows.map((r) => ` ${r.phase.padEnd(14)} | ${pad(r.per_second, 7)} | ${pad(r.p50, 6)} | ${pad(r.p95, 6)} | ${pad(r.max, 6)} | ${pad(r.failed_percent, 8)}`),
    '',
    `logins: ${login.per_second} a second, p50 ${login.p50} ms, p95 ${login.p95} ms (the form only, ${login.failed_percent} % refused or failed)`,
    alone.p95 > 0 ? `Cost of the logins to the pages: p95 of the reads x${(together.p95 / alone.p95).toFixed(1)} (${alone.p95} ms -> ${together.p95} ms), p50 ${alone.p50} -> ${together.p50} ms.` : '',
    '',
  ]
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const file = __ENV.RESULT_FILE || `load/results/${stamp}-mixed.json`
  return { stdout: lines.join('\n'), [file]: JSON.stringify({ title: 'mixed', base_url: BASE_URL, date: new Date().toISOString(), settings: { READ_RPS, LOGIN_RPS, ALONE_SECONDS, TOGETHER_SECONDS }, phases: rows, login }, null, 2) }
}
