// A signed-in user typing: the autosave of a library entry and of a job (the request sent about a second after the
// last key). It writes to the database, in the test accounts only. Creation of jobs and entries is not tested here:
// it has per-user limits (15 jobs and 30 entries an hour) that would answer 429 long before the site gives way.
// Needs the accounts of load/seed.sh.
import http from 'k6/http'
import { check } from 'k6'
import { SharedArray } from 'k6/data'
import { BASE_URL, authHeaders, explain, loadAccounts, pickUser, ramp, record, report, tags, thresholds, floor, probe, probeScenario } from './lib.js'

const NAMES = ['save-entry', 'save-job']
export const options = { scenarios: { autosave: ramp('save'), ...probeScenario() }, thresholds: thresholds(NAMES) }

const users = new SharedArray('users', () => loadAccounts(open('./.accounts.json')))

/** A text of about 300 characters, different each time, like a description being typed. */
const text = () => `Autosave of a load test, ${Date.now()}. ` + 'Built and ran a service, wrote the pipeline and took part in the rotation. '.repeat(4)

export function save() {
  const user = pickUser(users)
  const entity = Math.random() < 0.5
  const url = entity ? `${BASE_URL}/api/entities/projects/${user.projects[0]}` : `${BASE_URL}/api/jobs/${user.jobs[0]}`
  const body = JSON.stringify({ description: text() })
  const res = http.put(url, body, { headers: authHeaders(user, true), tags: tags(entity ? 'save-entry' : 'save-job'), jar: new http.CookieJar() })
  const ok = check(res, { 'the save answers 200': (r) => r.status === 200 })
  if (!ok) explain(res, 'save')
  record(ok)
}

export function setup() {
  floor()
}

export const handleSummary = (data) => report('autosave', data, { names: NAMES })

// The network probe of lib.js runs next to the ramp: k6 looks for its function in the script.
export { probe }
