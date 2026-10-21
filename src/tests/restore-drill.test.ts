import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { parse } from 'yaml'

// The restore drill (#105) is run by hand against the real cluster: this keeps it harmless. It must never be rolled out
// by Argo CD, must only read the backup volume, and may only drop the scratch database, never the production one.

const root = process.cwd()
const manifest = fs.readFileSync(path.join(root, 'k8s/postgres/restore-drill-job.yaml'), 'utf8')
const job = parse(manifest) as {
  kind: string
  spec: { backoffLimit: number; template: { spec: { restartPolicy: string; containers: { command: string[]; volumeMounts: { readOnly?: boolean }[] }[]; volumes: { persistentVolumeClaim: { claimName: string; readOnly?: boolean } }[] } } }
}
const script = job.spec.template.spec.containers[0].command[2]

describe('the restore drill', () => {
  it('is a Job that is not part of what Argo CD deploys', () => {
    expect(job.kind).toBe('Job')
    const kustomization = fs.readFileSync(path.join(root, 'k8s/kustomization.yaml'), 'utf8')
    expect(kustomization).not.toMatch(/restore-drill/)
  })

  it('reads the backup volume, read only, and does not retry a restore by itself', () => {
    const pod = job.spec.template.spec
    expect(pod.volumes[0].persistentVolumeClaim).toEqual({ claimName: 'pgbackup', readOnly: true })
    expect(pod.containers[0].volumeMounts.every((m) => m.readOnly === true)).toBe(true)
    expect(pod.restartPolicy).toBe('Never')
    expect(job.spec.backoffLimit).toBe(0)
  })

  it('drops and creates only the scratch database, never the production one', () => {
    const drops = [...script.matchAll(/DROP DATABASE (?:IF EXISTS )?(\w+)/g)].map((m) => m[1])
    expect(drops.length).toBeGreaterThan(0)
    expect(new Set(drops)).toEqual(new Set(['restore_drill']))
    expect([...script.matchAll(/CREATE DATABASE (\w+)/g)].map((m) => m[1])).toEqual(['restore_drill'])
    // The restore goes into the scratch database, and production is only read for its row counts.
    expect(script).toMatch(/psql -d restore_drill -v ON_ERROR_STOP=1/)
    expect(script).toMatch(/counts job_optimizer >/)
  })

  it('stops at the first error and prints what the person has to read: age, size, time, rows', () => {
    expect(script).toMatch(/set -euo pipefail/)
    for (const label of ['backup:', 'size:', 'taken:', 'restored in', 'rows per table']) expect(script, label).toContain(label)
  })
})

describe('the runbook', () => {
  const runbook = fs.readFileSync(path.join(root, 'docs/runbooks/restore-postgres.md'), 'utf8')

  it('names the manifest it runs and the job it follows', () => {
    expect(runbook).toContain('k8s/postgres/restore-drill-job.yaml')
    expect(runbook).toContain('kubectl logs -n job-optimizer -f job/restore-drill')
  })

  it('says plainly what is not yet true: the backups are in the cluster, and the real restore is unexercised', () => {
    expect(runbook).toMatch(/in the same cluster/)
    expect(runbook).toMatch(/Not exercised yet/)
  })
})
