// A visitor signing up, with the real form: the page is read for the hidden fields, then the form is sent with a new email
// and a password. Each sign-up hashes the password (like a login), writes the user, a session and a link of confirmation,
// and the app then tries to send the mail of confirmation.
//
// LOCAL ONLY (run.sh refuses a site that is not on this machine). On the production it would create real accounts and send
// a mail to each, to addresses that do not exist: bounces that damage the sender reputation of the site. The server under
// test must have no SMTP provider (no SMTP_ variable): the mail then fails at once and is only logged, and the account stays.
//
// The limits on sign-ups (30 an hour per address, 60 a day, 1,000 a day for the site) answer long before the site gives
// way: raise them on the server under test, as `SIGNUPS_PER_IP_PER_HOUR=100000 SIGNUPS_PER_IP_PER_DAY=100000
// SIGNUPS_MAX_PER_DAY=100000 npx next start -p 3100`. The accounts made are loadtest-signup-*@loadtest.invalid: `seed.sh
// cleanup` removes them with the others.
import http from 'k6/http'
import exec from 'k6/execution'
import { check } from 'k6'
import { BASE_URL, explain, hiddenFields, multipart, ramp, record, report, tags, thresholds, floor, probe, probeScenario } from './lib.js'

const NAMES = ['signup-page', 'signup']
export const options = { scenarios: { signup: ramp('signup'), ...probeScenario() }, thresholds: thresholds(NAMES) }

// Valid for the form: at least 8 characters, a letter and a digit.
const PASSWORD = 'LoadTest-Signup-1'

export function signup(data) {
  const jar = new http.CookieJar()
  const page = http.get(`${BASE_URL}/signup`, { redirects: 0, tags: tags('signup-page'), jar })
  const email = `loadtest-signup-${data.run}-${exec.scenario.iterationInTest}@loadtest.invalid`
  const form = multipart([...hiddenFields(String(page.body)), ['email', email], ['password', PASSWORD]])
  const res = http.post(`${BASE_URL}/signup`, form.body, { headers: { 'Content-Type': form.type, Origin: BASE_URL }, redirects: 0, tags: tags('signup'), jar })
  const cookie = res.headers['Set-Cookie'] || ''
  const ok = check(res, { 'the sign-up redirects (303)': (r) => r.status === 303, 'it gives a session cookie': () => cookie.includes('session=') })
  if (!ok) explain(res, 'sign-up')
  record(ok)
}

export function setup() {
  floor()
  // One name for the whole run, so that two runs do not meet the same addresses.
  return { run: Date.now().toString(36) }
}

export const handleSummary = (data) => report('signup', data, { requestsPerIteration: 2, names: NAMES })

// The network probe of lib.js runs next to the ramp: k6 looks for its function in the script.
export { probe }
