// The report of load/observe.sh, when it is stopped: the samples it took, one line per minute (the highest value of
// each resource in that minute) and the peaks. node load/summary.mjs <samples.txt>
// To put it next to a run's figures, step by step: node load/merge.mjs <result.json> <samples.txt> <access.log>
import { readSamples } from './samples.mjs'

const samples = readSamples(process.argv[2])
if (samples.length === 0) {
  console.log('No sample: kubectl top did not answer.')
  process.exit(0)
}
const max = (list, key) => list.reduce((m, s) => Math.max(m, s[key]), 0)
const pad = (v, n) => String(Math.round(v)).padStart(n)
const time = (ms) => new Date(ms).toLocaleTimeString('fr-FR')

const minutes = new Map()
for (const s of samples) {
  const key = Math.floor(s.at / 60000)
  minutes.set(key, [...(minutes.get(key) || []), s])
}
console.log('\nThe cluster, a line a minute (the highest value in the minute)\n')
console.log(' time     | app CPU m | app Mi | pg CPU m | nginx m | node CPU % | steal % | pods Mi')
console.log('----------+-----------+--------+----------+---------+------------+---------+--------')
for (const [key, list] of minutes) {
  console.log(` ${time(key * 60000)} | ${pad(max(list, 'appCpu'), 9)} | ${pad(max(list, 'appMem'), 6)} | ${pad(max(list, 'pgCpu'), 8)} | ${pad(max(list, 'nginxCpu'), 7)} | ${pad(max(list, 'nodeCpuPercent'), 10)} | ${max(list, 'steal').toFixed(1).padStart(7)} | ${pad(max(list, 'podsMem'), 7)}`)
}
console.log(`\nPeaks: app ${Math.round(max(samples, 'appCpu'))} m, ${Math.round(max(samples, 'appMem'))} Mi; Postgres ${Math.round(max(samples, 'pgCpu'))} m; node ${Math.round(max(samples, 'nodeCpuPercent'))} %; steal ${max(samples, 'steal').toFixed(1)} %; all pods ${Math.round(max(samples, 'podsMem'))} Mi (stop above 1800).\n`)
