/**
 * limits-in-sync.test.ts
 *
 * The app prices an AI call at the most the gateway allows (#203), so the two must agree on the size
 * of a prompt and of an answer (#220). They live in three places: the gateway's deployment, the
 * default in the gateway's Go code, and the app's `aiLimits()`. Until now a comment said "change them
 * together"; here a difference fails.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { aiLimits } from '@/lib/ai/limits'

const ROOT = path.resolve(__dirname, '../../')
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8')

afterEach(() => vi.unstubAllEnvs())

/** The value of an environment variable in a Kubernetes manifest, or null when it is not set there. */
function manifestValue(file: string, name: string): number | null {
  const match = read(file).match(new RegExp(`name: ${name}\\s*\\n\\s*value: "(\\d+)"`))
  return match ? Number(match[1]) : null
}

/** The default of a numeric setting in the gateway's config.go: `num("NAME", 60000)`. */
function goDefault(name: string): number {
  const match = read('services/ai-gateway/internal/config/config.go').match(new RegExp(`num\\("${name}",\\s*(\\d+)\\)`))
  if (!match) throw new Error(`no default for ${name} found in config.go: did the code change shape?`)
  return Number(match[1])
}

function appDefaults() {
  for (const name of ['AI_MAX_PROMPT_CHARS', 'AI_MAX_OUTPUT_TOKENS']) vi.stubEnv(name, '')
  const { maxPromptChars, maxOutputTokens } = aiLimits()
  return { maxPromptChars, maxOutputTokens }
}

const GATEWAY_MANIFEST = 'k8s/ai-gateway/deployment.yaml'
const APP_MANIFEST = 'k8s/app/deployment.yaml'

describe('limits in sync: the size of a prompt', () => {
  it('is the same in the gateway manifest and in the gateway code', () => {
    expect(manifestValue(GATEWAY_MANIFEST, 'MAX_PROMPT_CHARS')).toBe(goDefault('MAX_PROMPT_CHARS'))
  })

  it('is the same in the gateway and in what the app prices a call with', () => {
    expect(appDefaults().maxPromptChars, 'AI_MAX_PROMPT_CHARS (src/lib/ai/limits.ts) against MAX_PROMPT_CHARS of the gateway').toBe(
      manifestValue(GATEWAY_MANIFEST, 'MAX_PROMPT_CHARS'),
    )
  })

  it('is not overridden to something else in the app manifest', () => {
    const override = manifestValue(APP_MANIFEST, 'AI_MAX_PROMPT_CHARS')
    if (override !== null) expect(override).toBe(manifestValue(GATEWAY_MANIFEST, 'MAX_PROMPT_CHARS'))
  })
})

describe('limits in sync: the size of an answer', () => {
  it('is the same in the gateway manifest and in the gateway code', () => {
    expect(manifestValue(GATEWAY_MANIFEST, 'MAX_OUTPUT_TOKENS')).toBe(goDefault('MAX_OUTPUT_TOKENS'))
  })

  it('is the same in the gateway and in what the app prices a call with', () => {
    expect(appDefaults().maxOutputTokens, 'AI_MAX_OUTPUT_TOKENS (src/lib/ai/limits.ts) against MAX_OUTPUT_TOKENS of the gateway').toBe(
      manifestValue(GATEWAY_MANIFEST, 'MAX_OUTPUT_TOKENS'),
    )
  })

  it('is not overridden to something else in the app manifest', () => {
    const override = manifestValue(APP_MANIFEST, 'AI_MAX_OUTPUT_TOKENS')
    if (override !== null) expect(override).toBe(manifestValue(GATEWAY_MANIFEST, 'MAX_OUTPUT_TOKENS'))
  })
})

describe('limits in sync: the scan itself', () => {
  it('finds the values it compares (a scan that finds nothing proves nothing)', () => {
    expect(manifestValue(GATEWAY_MANIFEST, 'MAX_PROMPT_CHARS')).toBeGreaterThan(1000)
    expect(manifestValue(GATEWAY_MANIFEST, 'MAX_OUTPUT_TOKENS')).toBeGreaterThan(100)
    expect(goDefault('MAX_PROMPT_CHARS')).toBeGreaterThan(1000)
  })
})
