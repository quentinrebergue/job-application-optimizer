// A visitor who is not signed in: the landing page, the login page, the privacy page. Nothing is written.
// A visitor who comes for the first time also downloads the scripts and styles of the page (the app serves them too,
// on the same Node thread), so each page view fetches them like a browser with an empty cache: ASSETS=0 to turn it off.
import { check } from 'k6'
import http from 'k6/http'
import { BASE_URL, getPage, ramp, record, report, thresholds, floor, probe, probeScenario } from './lib.js'

const PAGES = [
  { path: '/', name: 'landing', words: 'Three clicks', weight: 6 },
  { path: '/login', name: 'login-page', words: 'Log in', weight: 3 },
  { path: '/privacy', name: 'privacy-page', words: 'privacy', weight: 1 },
]
const NAMES = [...PAGES.map((p) => p.name), 'asset']
const ASSETS = __ENV.ASSETS !== '0'
const MAX_ASSETS = 25
const total = PAGES.reduce((sum, p) => sum + p.weight, 0)

export const options = { scenarios: { anonymous: ramp('visit'), ...probeScenario() }, thresholds: thresholds(NAMES) }

/**
 * What a browser fetches for a page: its scripts and styles, and the fonts it preloads. A script marked noModule is the
 * polyfill for old browsers: a modern browser does not download it, so a visitor of the test does not either.
 */
function assetsOf(html) {
  const found = []
  for (const tag of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    if (/\bnoModule\b/i.test(tag[0])) continue
    const url = tag[0].match(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css|woff2))"/)
    if (url) found.push(url[1])
  }
  return found
}

export function visit() {
  let pick = Math.random() * total
  const page = PAGES.find((p) => (pick -= p.weight) < 0) || PAGES[0]
  const res = getPage(page.path, page.name)
  let ok = check(res, { [`${page.name} answers 200`]: (r) => r.status === 200, [`${page.name} is the right page`]: (r) => String(r.body).includes(page.words) })
  if (ASSETS && res.status === 200) {
    // Tagged apart (step 'asset'): they load the server but are not counted as page views of the step.
    const links = [...new Set(assetsOf(String(res.body)))].slice(0, MAX_ASSETS)
    const answers = http.batch(links.map((link) => ['GET', `${BASE_URL}${link}`, null, { redirects: 0, tags: { name: 'asset', step: 'asset' } }]))
    ok = check(answers, { 'assets answer 200': (rs) => rs.every((r) => r.status === 200) }) && ok
    // The fonts are named in the styles, so a browser asks for them once the styles have arrived.
    const fonts = [...new Set(answers.flatMap((r) => (String(r.url).endsWith('.css') ? [...String(r.body).matchAll(/url\((\/_next\/static\/media\/[^)"']+\.woff2)\)/g)].map((m) => m[1]) : [])))].slice(0, 3)
    if (fonts.length > 0) {
      const fontAnswers = http.batch(fonts.map((font) => ['GET', `${BASE_URL}${font}`, null, { redirects: 0, tags: { name: 'asset', step: 'asset' } }]))
      ok = check(fontAnswers, { 'fonts answer 200': (rs) => rs.every((r) => r.status === 200) }) && ok
    }
  }
  record(ok)
}

export function setup() {
  floor()
}

export const handleSummary = (data) => report('anonymous browsing', data, { names: NAMES })

// The network probe of lib.js runs next to the ramp: k6 looks for its function in the script.
export { probe }
