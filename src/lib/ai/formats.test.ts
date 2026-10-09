import { describe, it, expect } from 'vitest'
import { parse } from 'yaml'
import type { EntityMeta } from '@/types'
import { ANSWER_LAYOUT, parseYamlAnswer } from './formats'
import { buildRankingPrompt, normalizeRanking } from './ranking-prompt'

const exp = (id: string, title: string): EntityMeta => ({ id, type: 'experiences', title, company: 'Acme: Inc', period: '2022', description: 'Led a team, built "things": fast', tags: [] }) as EntityMeta
const skill = (id: string, name: string, tags: string[]): EntityMeta => ({ id, type: 'skills', name, category: 'x', level: 'advanced', tags }) as EntityMeta
const LIBRARY = { experiences: [exp('e-1', 'Firmware'), exp('e-2', 'Web')], projects: [], skills: [skill('s-1', 'Languages', ['C', 'C++', 'Python'])] }

describe('the example answers', () => {
  it('say the same thing in every format', () => {
    const json = JSON.parse(ANSWER_LAYOUT.json.example)
    expect(parse(ANSWER_LAYOUT.yaml.example)).toEqual(json)
    expect(parse(ANSWER_LAYOUT['yaml-compact'].example)).toEqual(json)
  })
})

describe('parseYamlAnswer', () => {
  it('reads YAML, with or without a code fence', () => {
    expect(parseYamlAnswer('levels:\n  E1: 3')).toEqual({ levels: { E1: 3 } })
    expect(parseYamlAnswer('```yaml\nlevels:\n  E1: 3\n```')).toEqual({ levels: { E1: 3 } })
  })

  it('refuses what is not YAML', () => {
    expect(() => parseYamlAnswer('levels: [E1: 3')).toThrow('not valid YAML')
  })

  it('gives the same answer as JSON once normalised', () => {
    const labels = buildRankingPrompt('Dev', 'Acme', 'x', LIBRARY).labels
    const asYaml = 'levels:\n  E1: 3\n  E2: 0\n  S1: 3\nbest:\n  experiences:\n    - id: E1\n      why: C firmware\n  skills:\n    - id: S1\n      tags: [1, 3]\n'
    const asJson = { levels: { E1: 3, E2: 0, S1: 3 }, best: { experiences: [{ id: 'E1', why: 'C firmware' }], skills: [{ id: 'S1', tags: [1, 3] }] } }
    expect(normalizeRanking(parseYamlAnswer(asYaml), labels)).toEqual(normalizeRanking(asJson, labels))
  })
})

describe('the request in each format', () => {
  it('shows the answer layout of the chosen format', () => {
    const yaml = buildRankingPrompt('Dev', 'Acme', 'x', LIBRARY, { answerFormat: 'yaml' }).prompt
    expect(yaml).toContain('YAML, nothing else')
    expect(yaml).toContain('levels:\n  E1: 3')
    expect(yaml).not.toContain('One JSON object')
  })

  it('writes the library as YAML that reads back, keeping the labels and the special characters', () => {
    const { prompt, parts } = buildRankingPrompt('Dev', 'Acme', 'x', LIBRARY, { libraryFormat: 'yaml' })
    const experiences = parse(parts.experiences.split('EXPERIENCES\n')[1])
    expect(experiences.E1).toEqual({ title: 'Firmware', company: 'Acme: Inc', period: '2022', description: 'Led a team, built "things": fast' })
    const skills = parse(parts.skills.split('\n').slice(1).join('\n'))
    expect(skills.S1).toEqual({ name: 'Languages', level: 'advanced', tags: ['C', 'C++', 'Python'] })
    expect(prompt).toContain('numbered from 1 in the order listed')
  })

  it('keeps JSON and text by default', () => {
    const { prompt } = buildRankingPrompt('Dev', 'Acme', 'x', LIBRARY)
    expect(prompt).toContain('One JSON object')
    expect(prompt).toContain('E1. Firmware at Acme: Inc')
  })
})
