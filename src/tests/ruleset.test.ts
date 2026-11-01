import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

// The protection of `master` is a ruleset kept as a file (.github/rulesets/master.json), applied with `gh api` (docs/security.md).
// It forbids deleting the branch and rewriting its history. It does not ask for a pull request yet: the delivery job commits
// the image tags to `master`, and GitHub does not let the GitHub Actions application bypass a ruleset on a personal repository.

const root = process.cwd()
const ruleset = JSON.parse(fs.readFileSync(path.join(root, '.github/rulesets/master.json'), 'utf8')) as {
  enforcement: string
  conditions: { ref_name: { include: string[] } }
  bypass_actors: unknown[]
  rules: { type: string }[]
}

describe('the ruleset of master', () => {
  it('protects the default branch, and is active', () => {
    expect(ruleset.enforcement).toBe('active')
    expect(ruleset.conditions.ref_name.include).toEqual(['~DEFAULT_BRANCH'])
  })

  it('forbids deleting it and rewriting its history, and nothing more for now', () => {
    expect(ruleset.rules.map((r) => r.type).sort()).toEqual(['deletion', 'non_fast_forward'])
  })

  it('has no bypass: the GitHub Actions application is refused as an actor on a personal repository (422)', () => {
    expect(ruleset.bypass_actors).toEqual([])
  })

  it('does not require what would stop the delivery job from pushing the image tags', () => {
    const types = ruleset.rules.map((r) => r.type)
    for (const stopsTheBot of ['pull_request', 'required_status_checks', 'required_signatures', 'update']) expect(types).not.toContain(stopsTheBot)
  })
})
