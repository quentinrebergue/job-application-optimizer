// Puts the two views of a run side by side: what k6 saw (the answers of the site, step by step) and what the cluster
// felt (CPU and memory of the pods and of the node, sampled by run.sh with kubectl top). Run by run.sh, in the
// container of the tools: node load/merge.mjs <result.json> <samples.txt>
//
// For each step it gives the highest value of each resource during the step, and a hint of what is full when the
// step broke. A hint, not a verdict: it only knows the resources it measures.
import fs from 'node:fs'
import { readSamples } from './samples.mjs'

const [, , resultFile, samplesFile, accessFile] = process.argv
const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'))

const samples = readSamples(samplesFile)

if (samples.length === 0) {
  console.log('\nNo sample of the cluster: the table above is all there is (OBSERVE=1 needs kubectl top to answer).')
  process.exit(0)
}

// ---- A scenario that is not a ramp (mixed, limits-probe...) has no steps: the highest value of each resource over the
// whole run, and the hint on that.
if (!result.ramp || !result.steps) {
  const top = (key) => samples.reduce((m, x) => Math.max(m, x[key] ?? 0), 0)
  const whole = { appCpu: top('appCpu'), appMem: top('appMem'), pgCpu: top('pgCpu'), hasherCpu: top('hasherCpu'), rendererCpu: top('rendererCpu'), nginxCpu: top('nginxCpu'), nodeCpuPercent: top('nodeCpuPercent'), nodeMem: top('nodeMem'), podsMem: top('podsMem') }
  const stolen = samples.filter((x) => x.steal !== null && x.steal !== undefined)
  const steal = stolen.length ? Math.max(...stolen.map((x) => x.steal)) : null
  const f = (v) => String(Math.round(v))
  console.log('')
  console.log(`The cluster during the whole run (kubectl top and the counters of the cgroups; the highest value of each, ${samples.length} samples)`)
  console.log('')
  console.log(` app CPU ${f(whole.appCpu)} m | app ${f(whole.appMem)} Mi | hasher ${f(whole.hasherCpu)} m | Postgres ${f(whole.pgCpu)} m | nginx ${f(whole.nginxCpu)} m | node CPU ${f(whole.nodeCpuPercent)} % | steal ${steal === null ? '-' : steal.toFixed(1)} % | pods ${f(whole.podsMem)} Mi`)
  const notes = []
  if (whole.hasherCpu >= 800) notes.push(`the password-hasher reached ${f(whole.hasherCpu)} m: one hash at a time is one core, it was the limit of the logins`)
  if (whole.appCpu >= 800) notes.push(`the app reached ${f(whole.appCpu)} m: one core is almost full`)
  if (whole.nodeCpuPercent >= 85) notes.push(`the node reached ${f(whole.nodeCpuPercent)} % of CPU`)
  if (steal !== null && steal >= 8) notes.push(`the hypervisor took up to ${steal.toFixed(1)} % of the node's CPU time (steal)`)
  console.log(notes.length ? notes.map((n) => `  - ${n}`).join('\n') : '  - none of the resources measured here was full')
  console.log('')
  process.exit(0)
}

// ---- Each step gets the samples taken during it. metrics-server reports the last 15 seconds or so, so a sample is
// attributed to the moment it started to describe.
const stepMs = result.ramp.STEP_SECONDS * 1000
const LAG_MS = 8000
const max = (list, key) => list.reduce((m, s) => Math.max(m, s[key]), 0)

const rows = result.steps.map((step) => {
  const from = result.started_at + (step.step - 1) * stepMs
  const inside = samples.filter((s) => s.at - LAG_MS >= from && s.at - LAG_MS < from + stepMs)
  return { step, inside, n: inside.length, appCpu: max(inside, 'appCpu'), appMem: max(inside, 'appMem'), pgCpu: max(inside, 'pgCpu'), hasherCpu: max(inside, 'hasherCpu'), rendererCpu: max(inside, 'rendererCpu'), nginxCpu: max(inside, 'nginxCpu'), nodeCpuPercent: max(inside, 'nodeCpuPercent'), steal: inside.some((x) => x.steal !== null) ? max(inside.filter((x) => x.steal !== null), 'steal') : null, nodeMem: max(inside, 'nodeMem'), podsMem: max(inside, 'podsMem') }
})

const pad = (v, n) => String(Math.round(v)).padStart(n)
const lines = [
  '',
  'Together: what the site answered (k6) and what the cluster felt (kubectl top; the highest value of each step)',
  '',
  ' step | target/s | reached/s |  p95 ms | failed % | app CPU m | app Mi | hasher m | pg CPU m | nginx m | node CPU % | steal % | pods Mi',
  '------+----------+-----------+---------+----------+-----------+--------+----------+----------+---------+------------+---------+--------',
  ...rows.map((r) => ` ${pad(r.step.step, 4)} | ${pad(r.step.target_rps, 8)} | ${String(r.step.achieved_rps).padStart(9)} | ${pad(r.step.p95_ms, 7)} | ${String(r.step.failed_percent).padStart(8)} | ${r.n ? pad(r.appCpu, 9) : '        -'} | ${r.n ? pad(r.appMem, 6) : '     -'} | ${r.n ? pad(r.hasherCpu, 8) : '       -'} | ${r.n ? pad(r.pgCpu, 8) : '       -'} | ${r.n ? pad(r.nginxCpu, 7) : '      -'} | ${r.n ? pad(r.nodeCpuPercent, 10) : '         -'} | ${r.n && r.steal !== null ? r.steal.toFixed(1).padStart(7) : '      -'} | ${r.n ? pad(r.podsMem, 7) : '      -'}${r.step.broken ? '  <- broken' : ''}`),
  '',
]

// ---- The hint: what is full at the first broken step (or the last one if none broke). Limits of this cluster: one core
// of the app thread, 384 Mi for the app, 2 cores for the node, about 2,000 Mi for all the pods.
const broken = rows.find((r) => r.step.broken) || null
const at = broken || rows[rows.length - 1]
const hints = []
if (at.n > 0) {
  if (at.appCpu >= 800) hints.push(`the app uses ${Math.round(at.appCpu)} m of CPU: one core is almost full, the Node thread is the limit (it cannot use the second core)`)
  if (at.steal !== null && at.steal >= 8) hints.push(`the hypervisor takes ${at.steal.toFixed(1)} % of the node's CPU time (steal): the vCPU is shared, the pods look idle and the answers are slow. This is what an instance with shared resources (Discovery) does under load: the figures of CPU above understate what the machine really lacks`)
  if (at.nodeCpuPercent >= 85) hints.push(`the node is at ${Math.round(at.nodeCpuPercent)} % of CPU: the machine itself is full, whatever runs on it`)
  if (at.appMem >= 330) hints.push(`the app holds ${Math.round(at.appMem)} Mi of its 384 Mi: the memory limit is near`)
  if (at.podsMem >= 1700) hints.push(`the pods hold ${Math.round(at.podsMem)} Mi together of the ~2,000 Mi the node allows them: memory is near the ceiling`)
  if (at.hasherCpu >= 800) hints.push(`the password-hasher uses ${Math.round(at.hasherCpu)} m of CPU: one hash at a time is one core, the service is the limit of the logins (MAX_CONCURRENT)`)
  if (at.pgCpu >= 800) hints.push(`Postgres uses ${Math.round(at.pgCpu)} m of CPU: the database is the limit`)
  if (at.rendererCpu >= 800) hints.push(`the renderer uses ${Math.round(at.rendererCpu)} m of CPU: the PDF engine is the limit`)
}
lines.push(broken ? `Where it broke (step ${broken.step.step}):` : 'No step broke; at the last step:')
lines.push(...(hints.length > 0 ? hints.map((h) => `  - ${h}`) : at.n === 0 ? ['  - no sample in that step (the run was too short for the sampling: one every 5 s, and metrics-server answers every 15 s)'] : ['  - none of the resources measured here is full: look elsewhere: the network or the machine that runs k6, the pool of connections, or a limit set in the code (rate limits, the queue of hashes, the renderer\'s 4 at once)']))
lines.push('')

// ---- The server's side: the access log of the ingress, cut by step. Nothing of the network of the machine that runs
// k6 is in it, except that a request is logged when it ends. The probe (/api/livez) is left out. If the time of the app
// stays low while k6 sees seconds, the slowness is on the way and not in the site; "got/s" lower than "asked" says that
// the load did not all arrive.
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
const requests = []
if (accessFile && fs.existsSync(accessFile)) {
  for (const line of fs.readFileSync(accessFile, 'utf8').split('\n')) {
    const when = line.match(/\[(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) [+-]\d{4}\]/)
    const quoted = line.split('"')
    if (!when || quoted.length < 7 || !/^[A-Z]+ /.test(quoted[1])) continue
    if (/^[A-Z]+ \/api\/(livez|healthz)/.test(quoted[1])) continue
    const rest = quoted[6].trim().split(/\s+/)
    const time = parseFloat(rest[1]) * 1000
    const app = parseFloat(rest[6]) * 1000
    if (Number.isNaN(time)) continue
    requests.push({ at: Date.UTC(+when[3], MONTHS[when[2]], +when[1], +when[4], +when[5], +when[6]), time, app: Number.isNaN(app) ? null : app })
  }
}
const percentile = (values, q) => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)]
}
if (requests.length > 0) {
  const stepSeconds = result.ramp.STEP_SECONDS
  lines.push(
    "The server's side (access log of the ingress, cut by step; no network of ours in it):",
    '',
    ' step | target/s | k6 reached/s | server got/s | k6 p95 ms | network p95 ms | server p95 ms | app p95 ms',
    '------+----------+--------------+--------------+-----------+----------------+---------------+-----------',
  )
  for (const row of result.steps) {
    const from = result.started_at + (row.step - 1) * stepMs
    const inside = requests.filter((r) => r.at >= from && r.at < from + stepMs)
    lines.push(` ${pad(row.step, 4)} | ${pad(row.target_rps, 8)} | ${String(row.achieved_rps).padStart(12)} | ${(inside.length / stepSeconds).toFixed(1).padStart(12)} | ${pad(row.p95_ms, 9)} | ${pad(row.floor_p95_ms || 0, 14)} | ${pad(percentile(inside.map((r) => r.time), 0.95), 13)} | ${pad(percentile(inside.filter((r) => r.app !== null).map((r) => r.app), 0.95), 10)}`)
  }
  lines.push(
    '',
    'Read it so: the app p95 is the site\'s own answer. If it stays low where k6 p95 climbs, the slowness is on the way (see "network p95"), and the step says nothing about the capacity of the site. If it climbs with k6, the site is the limit.',
    '',
  )
}

// A run of one step (a steady plateau) is read at a fixed rate: the mean of the samples says more than the highest
// value, which one spike of the 15 seconds of kubectl top can set.
if (rows.length === 1 && rows[0].n >= 3) {
  const inside = rows[0].inside
  const mean = (key) => inside.reduce((sum, x) => sum + x[key], 0) / inside.length
  const median = (key) => [...inside].map((x) => x[key]).sort((a, b) => a - b)[inside.length >> 1]
  lines.push(
    `Steady state, ${inside.length} samples (mean / median): app ${Math.round(mean('appCpu'))} / ${Math.round(median('appCpu'))} m, nginx ${Math.round(mean('nginxCpu'))} / ${Math.round(median('nginxCpu'))} m, password-hasher ${Math.round(mean('hasherCpu'))} m, node ${Math.round(mean('nodeCpuPercent'))} / ${Math.round(median('nodeCpuPercent'))} %, pods ${Math.round(mean('podsMem'))} Mi`,
    '',
  )
  // The CPU of the whole node for one visitor a second: what limits the site when the visits are first visits, whatever
  // the app does. The cores of the node by kind say where it goes (the kernel's own work belongs to no pod).
  const rate = rows[0].step.target_rps
  // The whole node, from the counters of the kernel (every 5 s) when there are some; kubectl top only changes about once a
  // minute and is only a fallback. A node of two cores: 1 % of its time is 20 m.
  const kindSamples = inside.filter((x) => x.kinds)
  const fromKernel = kindSamples.length > 0
  const nodeMilli = fromKernel
    ? (kindSamples.reduce((sum, x) => sum + (100 - x.kinds.idle - x.kinds.iowait), 0) / kindSamples.length) * 20
    : (mean('nodeCpuPercent') / 100) * 2000
  lines.splice(lines.length - 1, 0, `The node as a whole${fromKernel ? '' : ' (kubectl top: delayed, indicative only)'}: ${Math.round(nodeMilli)} m for ${rate} visits a second, ${(nodeMilli / rate).toFixed(0)} m per visit a second (the app ${(mean('appCpu') / rate).toFixed(0)}, nginx ${(mean('nginxCpu') / rate).toFixed(0)}, the rest ${((nodeMilli - mean('appCpu') - mean('nginxCpu')) / rate).toFixed(0)}). Assumes 2 cores.`)
  const withKinds = inside.filter((x) => x.kinds)
  if (withKinds.length > 0) {
    // Each kind as a share of the node's CPU time, in m of a node of two cores (1 % = 20 m).
    const kinds = ['user', 'system', 'softirq', 'irq', 'iowait', 'steal']
    const mean2 = (k) => withKinds.reduce((sum, x) => sum + x.kinds[k], 0) / withKinds.length
    lines.splice(lines.length - 1, 0, `By kind (mean of ${withKinds.length} samples, m of the node): ${kinds.map((k) => `${k} ${Math.round(mean2(k) * 20)}`).join(', ')}; steal ${mean2('steal').toFixed(1)} % of the node`)
  }
}

const out = lines.join('\n')
console.log(out)
fs.writeFileSync(resultFile.replace(/\.json$/, '-together.txt'), out)
