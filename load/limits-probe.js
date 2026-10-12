// Does the site limit what one address can do, and does it see the address of the visitor? Three probes, run one after
// the other from this machine (one address):
//  1. the edge: a flood of a cheap page (/api/livez, no database) at FLOOD_RPS for FLOOD_SECONDS, counting what comes
//     back. A 429 or 503 with an nginx page is the ingress limiting by address; a JSON error is the app. Nothing of
//     the kind means: no limit at that rate (the limits at the ingress are #224, not made yet).
//  2. the password reset (10 requests an hour per address): unknown emails (no mail is sent), until the app refuses.
//  3. the failed logins (60 an hour per address): wrong passwords on emails that do not exist, until the app refuses.
//     Then three more with a forged X-Real-IP / X-Forwarded-For: they must still be refused, the app must not trust
//     what the visitor says about its own address.
// Probes 2 and 3 use up the limits of THIS address: from it, logins and resets are refused for about an hour afterwards
// (others are not touched). They never touch an account, send a mail or create anything.
// For a site without the ingress in front (a local run), CLIENT_IP_HEADER=198.51.100.7 gives the address the way nginx
// would; the "forged header" check is then expected to say the header is trusted.
import http from 'k6/http'
import { Counter, Gauge } from 'k6/metrics'
import { BASE_URL, hiddenFields, multipart } from './lib.js'

const FLOOD_RPS = Number(__ENV.FLOOD_RPS || 40)
const FLOOD_SECONDS = Number(__ENV.FLOOD_SECONDS || 15)
const RESET_LIMIT = Number(__ENV.RESET_LIMIT || 10)
const LOGIN_LIMIT = Number(__ENV.LOGIN_LIMIT || 60)
const CLIENT_IP_HEADER = __ENV.CLIENT_IP_HEADER || ''

export const options = {
  scenarios: {
    edge: { executor: 'constant-arrival-rate', rate: FLOOD_RPS, timeUnit: '1s', duration: `${FLOOD_SECONDS}s`, preAllocatedVUs: 20, maxVUs: 100, exec: 'edge' },
    reset: { executor: 'per-vu-iterations', vus: 1, iterations: 1, maxDuration: '120s', startTime: `${FLOOD_SECONDS + 5}s`, exec: 'reset' },
    login: { executor: 'per-vu-iterations', vus: 1, iterations: 1, maxDuration: '300s', startTime: `${FLOOD_SECONDS + 15}s`, exec: 'login' },
  },
}

const edge200 = new Counter('edge_200')
const edge429 = new Counter('edge_429')
const edge503 = new Counter('edge_503')
const edgeNginx = new Counter('edge_refused_by_nginx')
const edgeOther = new Counter('edge_other')
const resetOk = new Counter('reset_accepted')
const resetFirstRefused = new Gauge('reset_first_refused')
const loginWrong = new Counter('login_answered_wrong_password')
const loginFirstRefused = new Gauge('login_first_refused')
const spoofRefused = new Counter('spoof_refused')
const spoofAccepted = new Counter('spoof_accepted')

const rand = () => Math.random().toString(16).slice(2, 10)
const asVisitor = () => (CLIENT_IP_HEADER ? { 'X-Real-IP': CLIENT_IP_HEADER } : {})

export function edge() {
  const res = http.get(`${BASE_URL}/api/livez`, { redirects: 0, jar: new http.CookieJar(), responseCallback: http.expectedStatuses(200, 429, 503), headers: asVisitor() })
  if (res.status === 200) edge200.add(1)
  else if (res.status === 429) edge429.add(1)
  else if (res.status === 503) edge503.add(1)
  else edgeOther.add(1)
  if ((res.status === 429 || res.status === 503) && /nginx|<html/i.test(String(res.body))) edgeNginx.add(1)
}

/** Sends a form of the app (a Server Action) the way a browser without JavaScript does; returns the page that answers. */
function sendForm(path, values, extraHeaders = {}) {
  const jar = new http.CookieJar()
  const page = http.get(`${BASE_URL}${path}`, { redirects: 0, jar, headers: { ...asVisitor(), ...extraHeaders } })
  const form = multipart([...hiddenFields(String(page.body)), ...Object.entries(values)])
  return http.post(`${BASE_URL}${path}`, form.body, {
    headers: { 'Content-Type': form.type, Origin: BASE_URL, ...asVisitor(), ...extraHeaders },
    redirects: 0,
    jar,
    responseCallback: http.expectedStatuses(200, 303),
  })
}

export function reset() {
  let first = 0
  for (let i = 1; i <= RESET_LIMIT + 3; i++) {
    const res = sendForm('/forgot-password', { email: `limit-probe-${rand()}@loadtest.invalid` })
    if (String(res.body).includes('Too many requests from your network')) {
      if (!first) first = i
    } else resetOk.add(1)
  }
  resetFirstRefused.add(first)
}

export function login() {
  let first = 0
  for (let i = 1; i <= LOGIN_LIMIT + 5; i++) {
    const res = sendForm('/login', { email: `limit-probe-${rand()}@loadtest.invalid`, password: 'not-a-password-1', returnTo: '/' })
    const body = String(res.body)
    if (body.includes('Too many failed attempts from your network')) {
      if (!first) first = i
    } else if (body.includes('Wrong email or password')) loginWrong.add(1)
  }
  loginFirstRefused.add(first)
  // The address is used up. A visitor that says it is somebody else must not get a fresh budget.
  for (let i = 0; i < 3; i++) {
    const forged = `198.51.100.${200 + i}`
    const res = sendForm('/login', { email: `limit-probe-${rand()}@loadtest.invalid`, password: 'not-a-password-1', returnTo: '/' }, { 'X-Real-IP': forged, 'X-Forwarded-For': forged })
    if (String(res.body).includes('Too many failed attempts from your network')) spoofRefused.add(1)
    else spoofAccepted.add(1)
  }
}

export function handleSummary(data) {
  const v = (name, stat = 'count') => (data.metrics[name] && data.metrics[name].values ? data.metrics[name].values[stat] || 0 : 0)
  const flooded = v('edge_200') + v('edge_429') + v('edge_503') + v('edge_other')
  const resetAt = v('reset_first_refused', 'value')
  const loginAt = v('login_first_refused', 'value')
  const lines = [
    '',
    `Limits per address, on ${BASE_URL}${CLIENT_IP_HEADER ? ` (as the address ${CLIENT_IP_HEADER})` : ''}`,
    '',
    `1. Edge: ${flooded} requests to /api/livez in ${FLOOD_SECONDS} s (${FLOOD_RPS} a second asked)`,
    `   200: ${v('edge_200')}, 429: ${v('edge_429')}, 503: ${v('edge_503')}, other or no answer: ${v('edge_other')}; refused with an nginx page: ${v('edge_refused_by_nginx')}`,
    v('edge_429') + v('edge_503') === 0
      ? '   -> no limit seen at this rate: either none, or above it. Raise FLOOD_RPS to look further.'
      : v('edge_refused_by_nginx') > 0
        ? '   -> the ingress limits the requests of one address.'
        : '   -> refused, but not by nginx: look at what answers (the app, the load balancer).',
    '',
    `2. Password reset: ${v('reset_accepted')} accepted${resetAt ? `, refused from the request number ${resetAt}` : ', never refused'} (expected from ${RESET_LIMIT + 1})`,
    resetAt === RESET_LIMIT + 1 ? '   -> the limit works on this address.' : resetAt ? '   -> the limit works, at a different number than expected: check RESET_LIMIT.' : '   -> never refused: the app does not see an address it can limit (see the ingress), or the limit differs.',
    '',
    `3. Failed logins: ${v('login_answered_wrong_password')} answered "wrong password"${loginAt ? `, refused from the request number ${loginAt}` : ', never refused'} (expected from ${LOGIN_LIMIT + 1})`,
    loginAt === LOGIN_LIMIT + 1 ? '   -> the limit works on this address.' : loginAt ? '   -> the limit works, at a different number than expected: check LOGIN_LIMIT.' : '   -> never refused: the app does not see an address it can limit, or the limit differs.',
    `   Forged address header, after the limit: ${v('spoof_refused')} refused, ${v('spoof_accepted')} accepted`,
    v('spoof_accepted') === 0 && v('spoof_refused') > 0 ? '   -> the forged header changes nothing: the app does not trust what a visitor says about its address.' : v('spoof_accepted') > 0 ? '   -> the forged header gives a fresh budget: the app trusts a header of the visitor (normal without an ingress in front, a flaw with one).' : '   -> not tested (the limit was not reached).',
    '',
  ]
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return { stdout: lines.join('\n'), [`load/results/${stamp}-limits-probe.txt`]: lines.join('\n') }
}
