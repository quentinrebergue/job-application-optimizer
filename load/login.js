// A user logging in, with the real form: the page is read for the hidden fields of the form, then the form is sent
// with an email and a password. Each login costs a quarter of a second of computation (bcrypt, two at a time), so
// this is the scenario that gives way first: its default ramp is low (1 to 8 a second).
// Needs the accounts of load/seed.sh and the same LOAD_PASSWORD (`-e LOAD_PASSWORD=...`).
import http from 'k6/http'
import { check } from 'k6'
import { SharedArray } from 'k6/data'
import { BASE_URL, hiddenFields, loadAccounts, multipart, pickUser, ramp, record, report, tags, thresholds, floor, probe, probeScenario } from './lib.js'

const NAMES = ['login-page', 'login']
export const options = { scenarios: { login: ramp('login'), ...probeScenario() }, thresholds: thresholds(NAMES) }

const users = new SharedArray('users', () => loadAccounts(open('./.accounts.json')))
const PASSWORD = __ENV.LOAD_PASSWORD

export function login() {
  if (!PASSWORD) throw new Error('Give the password of the test accounts: -e LOAD_PASSWORD=...')
  const user = pickUser(users)
  const jar = new http.CookieJar()
  const page = http.get(`${BASE_URL}/login`, { redirects: 0, tags: tags('login-page'), jar })
  const fields = [...hiddenFields(String(page.body)), ['email', user.email], ['password', PASSWORD]]
  const form = multipart(fields)
  const res = http.post(`${BASE_URL}/login`, form.body, {
    headers: { 'Content-Type': form.type, Origin: BASE_URL },
    redirects: 0,
    tags: tags('login'),
    jar,
  })
  const cookie = res.headers['Set-Cookie'] || ''
  record(check(res, { 'the login redirects (303)': (r) => r.status === 303, 'the login gives a session cookie': () => cookie.includes('session=') }))
}

export function setup() {
  floor()
}

export const handleSummary = (data) => report('login', data, { requestsPerIteration: 2, names: NAMES })

// The network probe of lib.js runs next to the ramp: k6 looks for its function in the script.
export { probe }
