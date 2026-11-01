import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { parse } from 'yaml'

// The nightly backup and its copy off the cluster (#105). The copy must be encrypted before it leaves the pod, its keys must
// come from a Secret and never from the repository, and the 7 days of the privacy page must hold by age, not by count.

const root = process.cwd()
const text = fs.readFileSync(path.join(root, 'k8s/postgres/backup-cronjob.yaml'), 'utf8')
const cron = parse(text) as {
  spec: { jobTemplate: { spec: { template: { spec: { restartPolicy: string; containers: { env: { name: string; value?: string; valueFrom?: { secretKeyRef: { name: string; key: string; optional?: boolean } } }[]; command: string[] }[] } } } } }
}
const container = cron.spec.jobTemplate.spec.template.spec.containers[0]
const script = container.command[2]
const env = Object.fromEntries(container.env.map((e) => [e.name, e]))

describe('the copy off the cluster', () => {
  it('goes to the bucket at Roubaix, another site than the cluster (Strasbourg)', () => {
    expect(env.S3_BUCKET.value).toBe('fastresume-db-backups')
    expect(env.RCLONE_S3_ENDPOINT.value).toBe('https://s3.rbx.io.cloud.ovh.net')
    expect(env.RCLONE_S3_REGION.value).toBe('rbx')
  })

  it('takes its keys from a Secret, which must exist (not optional), and holds none in the file', () => {
    for (const [name, key] of [['RCLONE_S3_ACCESS_KEY_ID', 'S3_ACCESS_KEY_ID'], ['RCLONE_S3_SECRET_ACCESS_KEY', 'S3_SECRET_ACCESS_KEY'], ['AGE_PUBLIC_KEY', 'AGE_PUBLIC_KEY']]) {
      expect(env[name].valueFrom?.secretKeyRef, name).toEqual({ name: 'backup-offsite', key })
      expect(env[name].value, name).toBeUndefined()
    }
    expect(text).not.toMatch(/age1[0-9a-z]{20,}|AGE-SECRET-KEY/)
  })

  it('encrypts the dump with age before anything is sent, and sends only the encrypted file', () => {
    expect(script).toMatch(/age -r "\$AGE_PUBLIC_KEY" -o "\$FILE\.age" "\$FILE"/)
    expect(script.indexOf('age -r')).toBeLessThan(script.indexOf('rclone copyto'))
    // The only upload names the .age file as its source and as its destination.
    expect([...script.matchAll(/rclone copyto/g)]).toHaveLength(1)
    expect(script).toContain('rclone copyto "$FILE.age" ":s3:$S3_BUCKET/$(basename "$FILE").age"')
    // The encrypted copy made for the upload does not stay on the volume.
    expect(script).toMatch(/rm -f "\$FILE\.age"/)
  })

  it('clears the encrypted copies a failed run left on the volume, before it dumps again', () => {
    expect(script).toContain('rm -f /backup/*.sql.gz.age')
    expect(script.indexOf('rm -f /backup/*.sql.gz.age')).toBeLessThan(script.indexOf('pg_dump'))
    // Only the temporary .age files: never the dumps, which are the first copy.
    expect(script).not.toMatch(/rm -f \/backup\/\*(?!\.sql\.gz\.age)/)
  })

  it('stops at the first failure, so a copy that did not leave makes the job fail', () => {
    expect(script).toMatch(/set -euo pipefail/)
  })
})

describe('the retention', () => {
  it('is 7 days by age, on the volume and in the bucket, and not a count of files', () => {
    expect(script).toMatch(/find \/backup -name 'job_optimizer-\*\.sql\.gz' -mtime \+6 -delete/)
    expect(script).toMatch(/rclone delete ":s3:\$S3_BUCKET" --min-age 7d --include 'job_optimizer-\*\.sql\.gz\.age'/)
    expect(script).not.toMatch(/tail -n \+8/)
  })

  it('removes the old ones only after the new dump is written, so the newest always stays', () => {
    expect(script.indexOf('pg_dump')).toBeLessThan(script.indexOf('-mtime +6'))
    expect(script.indexOf('rclone copyto')).toBeLessThan(script.indexOf('rclone delete'))
  })
})

describe('the runbook of the copy', () => {
  const runbook = fs.readFileSync(path.join(root, 'docs/runbooks/restore-postgres.md'), 'utf8')

  it('says to make the Secret before Argo CD syncs, where the private key must be kept, and how to read a copy', () => {
    expect(runbook).toMatch(/before\*\* Argo CD syncs the CronJob/)
    expect(runbook).toMatch(/private key stays with you and \*\*nowhere in the cluster\*\*/)
    expect(runbook).toContain('age -d -i ~/fastresume-backup-age-key.txt')
  })

  it('tells what to do about the accounts deleted since a backup, and admits there is no durable list yet', () => {
    expect(runbook).toMatch(/## After any restore: the accounts that were deleted come back/)
    expect(runbook).toMatch(/No durable list of the accounts deleted/)
  })
})
