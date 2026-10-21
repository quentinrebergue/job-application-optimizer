import { describe, it, expect } from 'vitest'
import { FLAGS, helpText, parseArguments } from './args'

describe('parseArguments', () => {
  it('has defaults: JSON, text library, schema, one run', () => {
    expect(parseArguments([])).toMatchObject({ runs: 1, parallel: 1, answerFormat: 'json', libraryFormat: 'text', schema: true, help: false, details: false })
  })

  it('reads values and switches', () => {
    const a = parseArguments(['--model', 'm', '--runs', '5', '--case', 'helsing', '--no-schema', '--clean-offer', 'code', '--details', '--answer-format', 'yaml'])
    expect(a).toMatchObject({ model: 'm', runs: 5, case: 'helsing', schema: false, cleanOffer: 'code', details: true, answerFormat: 'yaml' })
  })

  it('reads --pad and refuses a bad one', () => {
    expect(parseArguments(['--pad', '10']).pad).toBe(10)
    expect(parseArguments([]).pad).toBeUndefined()
    expect(() => parseArguments(['--pad', '0'])).toThrow('--pad')
    expect(() => parseArguments(['--pad', 'x'])).toThrow('--pad')
  })

  it('reads --pad-length, which needs --pad', () => {
    expect(parseArguments(['--pad', '7', '--pad-length', '800']).padLength).toBe(800)
    expect(() => parseArguments(['--pad-length', '800'])).toThrow('goes with --pad')
    expect(() => parseArguments(['--pad', '7', '--pad-length', '0'])).toThrow('--pad-length')
  })

  it('reads --sizes', () => {
    expect(parseArguments(['--sizes'])).toMatchObject({ sizes: true })
    expect(parseArguments([]).sizes).toBe(false)
  })

  it('refuses an unknown option and a bad value, with a hint', () => {
    expect(() => parseArguments(['--nope'])).toThrow('--help')
    expect(() => parseArguments(['--answer-format', 'xml'])).toThrow('--answer-format is one of')
    expect(() => parseArguments(['--runs', '0'])).toThrow('--runs')
    expect(() => parseArguments(['--clean-offer', 'ai'])).toThrow('--clean-offer is code')
  })
})

describe('helpText', () => {
  it('explains every option', () => {
    const help = helpText()
    for (const f of FLAGS) expect(help).toContain(`--${f.name}`)
    expect(help).toContain('Examples:')
  })

  it('says which options never call the AI', () => {
    const help = helpText()
    expect(help).toMatch(/unless you pass --sizes or --dry-run/)
    expect(help).toContain('--sizes')
  })

  it('reads --parallel, one to eight, and refuses the rest', () => {
    expect(parseArguments(['--parallel', '4']).parallel).toBe(4)
    for (const bad of ['0', '9', '2.5', 'x']) expect(() => parseArguments(['--parallel', bad]), bad).toThrow('--parallel')
  })
})
