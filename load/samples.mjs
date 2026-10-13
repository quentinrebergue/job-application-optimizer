// Reads the samples written by run.sh and observe.sh: "@@ <seconds>", the lines of `kubectl top pod -A`, "## node",
// the line of `kubectl top node`, "## procstat", the counters of CPU time of the whole node (the first line of /proc/stat).
import fs from 'node:fs'

// The kinds of CPU time of /proc/stat, in the order of its fields.
const KINDS = ['user', 'nice', 'system', 'idle', 'iowait', 'irq', 'softirq', 'steal']

/** For each sample, the share of the node's CPU time of each kind since the previous sample, in % (null when unknown). */
function withKinds(samples) {
  return samples.map((s, i) => {
    const prev = samples[i - 1]
    if (!s.counters || !prev || !prev.counters) return { ...s, kinds: null, steal: null }
    const delta = KINDS.map((_, k) => s.counters[k] - prev.counters[k])
    const total = delta.reduce((a, b) => a + b, 0)
    if (total <= 0) return { ...s, kinds: null, steal: null }
    const kinds = Object.fromEntries(KINDS.map((k, j) => [k, (delta[j] / total) * 100]))
    return { ...s, kinds, steal: kinds.steal }
  })
}

/**
 * CPU of a few pods from the counters of their cgroups: the milli-cores used since the previous sample, exact and not
 * delayed (kubectl top is neither). Replaces the figure of kubectl top for the pods that have a counter.
 */
function withCgroupCpu(samples) {
  const names = { appCpu: 'app', nginxCpu: 'nginx', pgCpu: 'postgres' }
  return samples.map((s, i) => {
    const prev = samples[i - 1]
    if (!s.cgroups || !prev || !prev.cgroups || !(s.cgroups.ms > prev.cgroups.ms)) return { ...s, cpuSource: 'top' }
    const out = { ...s, cpuSource: 'cgroup' }
    for (const [field, key] of Object.entries(names)) {
      if (s.cgroups[key] !== undefined && prev.cgroups[key] !== undefined) out[field] = (s.cgroups[key] - prev.cgroups[key]) / (s.cgroups.ms - prev.cgroups.ms)
    }
    return out
  })
}

export function readSamples(samplesFile) {
  const cpu = (v) => (/m$/.test(v) ? parseFloat(v) : /n$/.test(v) ? parseFloat(v) / 1e6 : parseFloat(v) * 1000)
  const mem = (v) => (/Gi$/.test(v) ? parseFloat(v) * 1024 : /Ki$/.test(v) ? parseFloat(v) / 1024 : parseFloat(v))
  const samples = fs
    .readFileSync(samplesFile, 'utf8')
    .split('@@ ')
    .slice(1)
    .map((block) => {
      const [head, ...lines] = block.split('\n')
      const pods = []
      let node = null
      let counters = null
      let cgroups = null
      let part = 'pods'
      for (const line of lines.map((l) => l.trim()).filter(Boolean)) {
        if (line === '## node') part = 'node'
        else if (line === '## procstat') part = 'procstat'
      else if (line === '## cgroups') part = 'cgroups'
      else if (part === 'cgroups') cgroups = Object.fromEntries(line.split(' ').map((kv) => kv.split('=')).filter(([k, v]) => k && v !== undefined && v !== '' && !Number.isNaN(Number(v))).map(([k, v]) => [k, Number(v)]))
        else if (part === 'procstat') { const f = line.split(' '); if (f[0] === 'cpu') counters = f.slice(1).map(Number) }
        else if (part === 'node') {
          const [, c, , m] = line.split(/\s+/)
          node = { cpuPercent: parseFloat(line.split(/\s+/)[2]), cpu: cpu(c), mem: mem(m) }
        } else {
          const [ns, name, c, m] = line.split(/\s+/)
          if (m) pods.push({ ns, name, cpu: cpu(c), mem: mem(m) })
        }
      }
      const pick = (ns, prefix) => pods.find((p) => p.ns === ns && p.name.startsWith(prefix)) || { cpu: 0, mem: 0 }
      const app = pick('job-optimizer', 'app-')
      return {
        at: Number(head) * 1000,
        appCpu: app.cpu, appMem: app.mem,
        pgCpu: pick('job-optimizer', 'postgres-').cpu,
        hasherCpu: pick('job-optimizer', 'password-hasher-').cpu,
        rendererCpu: pick('job-optimizer', 'resume-renderer-').cpu,
        nginxCpu: pods.filter((p) => p.ns === 'ingress-nginx').reduce((s, p) => s + p.cpu, 0),
        nodeCpuPercent: node ? node.cpuPercent : 0,
        counters,
        cgroups,
        nodeMem: node ? node.mem : 0,
        podsMem: pods.reduce((s, p) => s + p.mem, 0),
      }
    })
  return withCgroupCpu(withKinds(samples))
}
