// A signed-in user downloading a resume: the app reads the user's data and asks the resume renderer for a PDF.
// Two limits answer 429 with a different meaning, and the script tells them apart:
//  - "rate_limited" is the per-user limit (30 PDFs an hour, 100 a day): the test accounts run out of it after
//    about 1,400 PDFs an hour in all, and the script counts those answers apart (they are not the site giving way);
//  - "busy" is the renderer refusing more than 4 PDFs at the same instant: that one is a failure, it is what the
//    scenario looks for.
// Needs the accounts of load/seed.sh.
import http from 'k6/http'
import { check } from 'k6'
import { SharedArray } from 'k6/data'
import { Counter } from 'k6/metrics'
import { BASE_URL, authHeaders, loadAccounts, pickUser, ramp, record, report, tags, thresholds, floor, probe, probeScenario } from './lib.js'

const NAMES = ['pdf']
export const options = { scenarios: { pdf: ramp('download'), ...probeScenario() }, thresholds: thresholds(NAMES) }

const users = new SharedArray('users', () => loadAccounts(open('./.accounts.json')))
const quotaRefused = new Counter('quota_refused')

export function download() {
  const user = pickUser(users)
  const res = http.post(`${BASE_URL}/api/resume/generate`, JSON.stringify({ jobId: user.jobs[0] }), {
    headers: authHeaders(user, true),
    tags: tags('pdf'),
    jar: new http.CookieJar(),
    responseCallback: http.expectedStatuses(200, 429),
  })
  if (res.status === 429 && String(res.body).includes('rate_limited')) {
    quotaRefused.add(1)
    return
  }
  record(check(res, { 'the PDF answers 200': (r) => r.status === 200, 'it is a PDF': (r) => String(r.body).startsWith('%PDF') }))
}

export function setup() {
  floor()
}

export const handleSummary = (data) => report('pdf', data, { names: NAMES })

// The network probe of lib.js runs next to the ramp: k6 looks for its function in the script.
export { probe }
