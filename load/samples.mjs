// Reads the samples written by run.sh and observe.sh: "@@ <seconds>", the lines of `kubectl top pod -A`, "## node",
// the line of `kubectl top node`, "## steal", the share of CPU time the hypervisor took (Prometheus).
import fs from 'node:fs'

export function readSamples(samplesFile) {
  const cpu = (v) => (/m$/.test(v) ? parseFloat(v) : /n$/.test(v) ? parseFloat(v) / 1e6 : parseFloat(v) * 1000)
  const mem = (v) => (/Gi$/.test(v) ? parseFloat(v) * 1024 : /Ki$/.test(v) ? parseFloat(v) / 1024 : parseFloat(v))
  return fs
    .readFileSync(samplesFile, 'utf8')
    .split('@@ ')
    .slice(1)
    .map((block) => {
      const [head, ...lines] = block.split('\n')
      const pods = []
      let node = null
      let steal = null
      let part = 'pods'
      for (const line of lines.map((l) => l.trim()).filter(Boolean)) {
        if (line === '## node') part = 'node'
        else if (line === '## steal') part = 'steal'
        else if (part === 'steal') steal = Number(line) * 100
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
        rendererCpu: pick('job-optimizer', 'resume-renderer-').cpu,
        nginxCpu: pods.filter((p) => p.ns === 'ingress-nginx').reduce((s, p) => s + p.cpu, 0),
        nodeCpuPercent: node ? node.cpuPercent : 0,
        steal: steal === null || Number.isNaN(steal) ? 0 : steal,
        nodeMem: node ? node.mem : 0,
        podsMem: pods.reduce((s, p) => s + p.mem, 0),
      }
    })
}
