import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { buildRankingPrompt } from '@/lib/ai/ranking-prompt'
import type { EvalCase } from './cases'
import { safeHeader } from './cases'
import { findLeaks } from './leaks'

// The versioned example case carries a header with a fictional person: what the evaluation sends of it holds none of
// the person's details (#294), the check `eval:ranking` runs on every case that has a header.
const example = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'eval/cases/example-embedded.json'), 'utf8')) as EvalCase

describe('the example case with a header', () => {
  const { prompt } = buildRankingPrompt(example.job.title, example.job.company, example.job.description, example.entities, {}, safeHeader(example))

  it('sends the title and the profile, with the person taken out', () => {
    expect(prompt).toContain('CANDIDATE HEADER')
    expect(prompt).toContain('Title: Software Engineer')
    expect(prompt).toContain('[name]')
    expect(prompt).toContain('[email]')
    expect(prompt).toContain('Backend developer with experience in embedded Linux and C')
  })

  it('holds no detail of the person, and the check finds one when it is there', () => {
    expect(findLeaks(example.header, prompt)).toEqual([])
    const unsafe = buildRankingPrompt(example.job.title, example.job.company, example.job.description, example.entities, {}, example.header)
    expect(findLeaks(example.header, unsafe.prompt).length).toBeGreaterThan(0)
  })
})
