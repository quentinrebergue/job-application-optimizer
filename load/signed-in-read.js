// A signed-in user reading: their jobs, their library, one of their jobs. Each page asks the database. Nothing is written.
// Needs the accounts of load/seed.sh.
import { check } from 'k6'
import { SharedArray } from 'k6/data'
import { authHeaders, getPage, loadAccounts, pickUser, ramp, record, report, thresholds, floor, probe, probeScenario } from './lib.js'

const NAMES = ['jobs-list', 'library', 'one-job']
export const options = { scenarios: { reading: ramp('read'), ...probeScenario() }, thresholds: thresholds(NAMES) }

const users = new SharedArray('users', () => loadAccounts(open('./.accounts.json')))

export function read() {
  const user = pickUser(users)
  const roll = Math.random()
  const page =
    roll < 0.5
      ? { path: '/jobs', name: 'jobs-list', words: 'Job Tracker' }
      : roll < 0.8
        ? { path: '/resume', name: 'library', words: 'Resume' }
        : { path: `/jobs/${user.jobs[0]}`, name: 'one-job', words: 'Backend Engineer' }
  const res = getPage(page.path, page.name, authHeaders(user))
  record(check(res, { [`${page.name} answers 200`]: (r) => r.status === 200, [`${page.name} is the right page`]: (r) => String(r.body).includes(page.words) }))
}

export function setup() {
  floor()
}

export const handleSummary = (data) => report('signed-in reading', data, { names: NAMES })

// The network probe of lib.js runs next to the ramp: k6 looks for its function in the script.
export { probe }
