import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { parse } from 'yaml'

// The protection of `master` is a ruleset kept as a file (.github/rulesets/master.json), applied with `gh api` once the
// repository is public (docs/security.md). It names the checks a pull request must pass: they must be jobs that exist.

const root = process.cwd()
const ruleset = JSON.parse(fs.readFileSync(path.join(root, '.github/rulesets/master.json'), 'utf8')) as {
  enforcement: string
  conditions: { ref_name: { include: string[] } }
  bypass_actors: { actor_id: number; actor_type: string; bypass_mode: string }[]
  rules: { type: string; parameters?: Record<string, unknown> }[]
}
const jobsOf = (file: string) => Object.keys((parse(fs.readFileSync(path.join(root, '.github/workflows', file), 'utf8')) as { jobs: object }).jobs)

describe('the ruleset of master', () => {
  it('protects the default branch, and is active', () => {
    expect(ruleset.enforcement).toBe('active')
    expect(ruleset.conditions.ref_name.include).toEqual(['~DEFAULT_BRANCH'])
  })

  it('forbids deleting it and rewriting it, and asks for a pull request merged by squash', () => {
    const types = ruleset.rules.map((r) => r.type)
    expect(types).toEqual(expect.arrayContaining(['deletion', 'non_fast_forward', 'pull_request', 'required_status_checks']))
    const pr = ruleset.rules.find((r) => r.type === 'pull_request')!
    expect(pr.parameters?.allowed_merge_methods).toEqual(['squash'])
  })

  it('lets only the delivery bot push to it, and the owner only through a pull request', () => {
    const bypass = Object.fromEntries(ruleset.bypass_actors.map((a) => [a.actor_type, a]))
    // The CD pushes the new image tags to master with the token of the workflow (the GitHub Actions application).
    expect(bypass.Integration).toMatchObject({ actor_id: 15368, bypass_mode: 'always' })
    expect(bypass.RepositoryRole).toMatchObject({ bypass_mode: 'pull_request' })
    expect(ruleset.bypass_actors).toHaveLength(2)
  })

  it('requires checks that are jobs of the workflows', () => {
    const required = (ruleset.rules.find((r) => r.type === 'required_status_checks')!.parameters!.required_status_checks as { context: string }[]).map((c) => c.context)
    const existing = new Set([...jobsOf('ci.yml'), ...jobsOf('security.yml')])
    expect(required.filter((c) => !existing.has(c)), 'required but not a job').toEqual([])
    // The change detection decides what runs; the jobs that build and test every part are required.
    for (const job of ['test', 'docker-build', 'secrets']) expect(required).toContain(job)
  })
})
