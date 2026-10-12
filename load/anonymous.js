// A visitor who is not signed in: the landing page, the login page, the privacy page. Nothing is written.
import { check } from 'k6'
import { getPage, ramp, record, report, thresholds, floor, probe, probeScenario } from './lib.js'

const PAGES = [
  { path: '/', name: 'landing', words: 'Three clicks', weight: 6 },
  { path: '/login', name: 'login-page', words: 'Log in', weight: 3 },
  { path: '/privacy', name: 'privacy-page', words: 'privacy', weight: 1 },
]
const NAMES = PAGES.map((p) => p.name)
const total = PAGES.reduce((sum, p) => sum + p.weight, 0)

export const options = { scenarios: { anonymous: ramp('visit'), ...probeScenario() }, thresholds: thresholds(NAMES) }

export function visit() {
  let pick = Math.random() * total
  const page = PAGES.find((p) => (pick -= p.weight) < 0) || PAGES[0]
  const res = getPage(page.path, page.name)
  record(check(res, { [`${page.name} answers 200`]: (r) => r.status === 200, [`${page.name} is the right page`]: (r) => String(r.body).includes(page.words) }))
}

export function setup() {
  floor()
}

export const handleSummary = (data) => report('anonymous browsing', data, { names: NAMES })

// The network probe of lib.js runs next to the ramp: k6 looks for its function in the script.
export { probe }
