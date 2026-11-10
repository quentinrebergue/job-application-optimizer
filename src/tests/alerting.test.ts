import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { parse } from 'yaml'

// The alerts of the cluster (#29): Alertmanager is on, its configuration (a password, an address) is a Secret and never
// a file of the repository, and the rules we wrote say what to do. The chart renders the real rules; this keeps the
// intent from being edited away without noticing.

const dir = path.resolve(process.cwd(), 'k8s/monitoring')
const valuesText = fs.readFileSync(path.join(dir, 'values.yaml'), 'utf8')
const values = parse(valuesText) as {
  alertmanager: { enabled: boolean; alertmanagerSpec: { configSecret: string; resources: { limits: { memory: string } } } }
  defaultRules: { disabled: Record<string, boolean> }
  additionalPrometheusRulesMap: { fastresume: { groups: { name: string; rules: { alert: string; expr: string; for: string; labels: { severity: string }; annotations: { summary: string; description: string } }[] }[] } }
}
const rules = values.additionalPrometheusRulesMap.fastresume.groups.flatMap((g) => g.rules)

describe('Alertmanager', () => {
  it('is on, with its configuration in a Secret and a small memory limit', () => {
    expect(values.alertmanager.enabled).toBe(true)
    expect(values.alertmanager.alertmanagerSpec.configSecret).toBe('alertmanager-config')
    expect(values.alertmanager.alertmanagerSpec.resources.limits.memory).toMatch(/^\d+Mi$/)
  })

  it('has no password, address or key in the repository: the example only holds placeholders', () => {
    const example = fs.readFileSync(path.join(dir, 'alertmanager.example.yaml'), 'utf8')
    const config = parse(example) as { global: Record<string, string>; receivers: { email_configs?: { to: string }[] }[] }
    for (const value of [config.global.smtp_smarthost, config.global.smtp_from, config.global.smtp_auth_username, config.global.smtp_auth_password]) {
      expect(value, value).toMatch(/<.+>/)
    }
    expect(config.receivers.find((r) => r.email_configs)?.email_configs?.[0].to).toMatch(/<.+>/)
    expect(valuesText).not.toMatch(/smtp_auth_password|@(gmail|outlook|proton)\./i)
  })

  it('sends warnings and criticals by email and drops the rest (Watchdog, info)', () => {
    const config = parse(fs.readFileSync(path.join(dir, 'alertmanager.example.yaml'), 'utf8')) as {
      route: { receiver: string; routes: { receiver: string; matchers: string[] }[] }
      receivers: { name: string; email_configs?: unknown[] }[]
    }
    expect(config.receivers.find((r) => r.name === config.route.receiver)?.email_configs).toBeUndefined()
    expect(config.route.routes[0]).toEqual({ receiver: 'email', matchers: ['severity=~"warning|critical"'] })
    expect(config.receivers.find((r) => r.name === 'email')?.email_configs).toHaveLength(1)
  })
})

describe('the rules of the cluster', () => {
  it('cover what the incident of 2026-10-02 showed (memory pressure, low memory, evictions, the app without a replica) and a backup that stopped', () => {
    expect(rules.map((r) => r.alert).sort()).toEqual(['AppNoReplicaAvailable', 'BackupTooOld', 'NodeMemoryLow', 'NodeMemoryPressure', 'PodEvicted'])
  })

  it('each says how serious it is, what happened and what to do', () => {
    for (const rule of rules) {
      expect(['warning', 'critical'], rule.alert).toContain(rule.labels.severity)
      expect(rule.annotations.summary, rule.alert).not.toBe('')
      expect(rule.annotations.description, rule.alert).not.toBe('')
      expect(rule.expr, rule.alert).not.toBe('')
    }
  })

  it('wait a little before firing, so a normal rollout stays silent', () => {
    for (const rule of rules) expect(rule.for, rule.alert).toMatch(/^\d+m$/)
    expect(Number(rules.find((r) => r.alert === 'AppNoReplicaAvailable')!.for.replace('m', ''))).toBeGreaterThanOrEqual(2)
  })

  it('watch the backup CronJob for more than a day, and for one that never succeeded', () => {
    const rule = rules.find((r) => r.alert === 'BackupTooOld')!
    expect(rule.expr).toContain('kube_cronjob_status_last_successful_time')
    expect(rule.expr).toContain('cronjob="postgres-backup"')
    expect(rule.expr).toMatch(/> 26 \* 3600/)
    expect(rule.expr).toContain('absent(')
    expect(rule.labels.severity).toBe('critical')
  })

  it('switch off the chart alerts that cannot hold on one node, so the emails stay worth reading', () => {
    for (const name of ['KubeCPUOvercommit', 'KubeMemoryOvercommit', 'NodeMemoryHighUtilization']) expect(values.defaultRules.disabled[name], name).toBe(true)
  })
})
