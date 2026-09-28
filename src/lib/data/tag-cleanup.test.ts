/**
 * tag-cleanup.test.ts
 *
 * Tests for src/lib/data/tag-cleanup.ts → purgeTagAliases()
 *
 * Mocks fs/promises so all file discovery and writes are in-memory.
 * The mock replicates the directory layout that collectTaggedFiles() expects.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import path from 'path'

// ── In-memory store ───────────────────────────────────────────────────────────

const files: Map<string, string> = new Map()
const dirs: Map<string, string[]> = new Map()

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  const mocked = {
    ...actual,
    readdir: vi.fn(async (dir: unknown) => dirs.get(dir as string) ?? []),
    readFile: vi.fn(async (filePath: unknown) => {
      const p = filePath as string
      if (!files.has(p)) throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' })
      return files.get(p)!
    }),
    writeFile: vi.fn(async (filePath: unknown, content: unknown) => {
      files.set(filePath as string, content as string)
    }),
    mkdir: vi.fn(async () => undefined),
  }
  return { ...mocked, default: mocked }
})

import { purgeTagAliases } from './tag-cleanup'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'data')

function writeJson(filePath: string, data: unknown) {
  files.set(filePath, JSON.stringify(data, null, 2))
}

function readJson(filePath: string): Record<string, unknown> {
  const raw = files.get(filePath)
  if (!raw) throw new Error(`File not in mock store: ${filePath}`)
  return JSON.parse(raw)
}

function setupEmpty() {
  // No entity subdirs
  for (const type of ['experiences', 'projects', 'skills', 'education']) {
    dirs.set(path.join(DATA_DIR, 'entities', type), [])
  }
  dirs.set(path.join(DATA_DIR, 'jobs'), [])
  dirs.set(path.join(DATA_DIR, 'coding', 'exercises'), [])
  dirs.set(path.join(DATA_DIR, 'coding', 'knowledge'), [])
  dirs.set(path.join(DATA_DIR, 'general-questions'), [])
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  files.clear()
  dirs.clear()
  vi.clearAllMocks()
})

describe('purgeTagAliases', () => {
  it('returns 0 when aliases list is empty', async () => {
    setupEmpty()
    expect(await purgeTagAliases([])).toBe(0)
  })

  it('removes matching tags from entity meta.json', async () => {
    const metaPath = path.join(DATA_DIR, 'entities', 'experiences', 'exp-001', 'meta.json')
    writeJson(metaPath, { id: 'exp-001', tags: ['STM32', 'Node.js', 'C++'] })
    dirs.set(path.join(DATA_DIR, 'entities', 'experiences'), ['exp-001'])
    for (const type of ['projects', 'skills', 'education']) {
      dirs.set(path.join(DATA_DIR, 'entities', type), [])
    }
    setupEmpty()
    dirs.set(path.join(DATA_DIR, 'entities', 'experiences'), ['exp-001'])

    const count = await purgeTagAliases(['STM32', 'C++'])
    expect(count).toBe(1)
    expect(readJson(metaPath).tags).toEqual(['Node.js'])
  })

  it('is case-insensitive when removing tags', async () => {
    const metaPath = path.join(DATA_DIR, 'entities', 'projects', 'proj-001', 'meta.json')
    writeJson(metaPath, { tags: ['react', 'TypeScript'] })
    setupEmpty()
    dirs.set(path.join(DATA_DIR, 'entities', 'projects'), ['proj-001'])

    await purgeTagAliases(['REACT'])
    expect(readJson(metaPath).tags).toEqual(['TypeScript'])
  })

  it('removes matching tags from job offer.json', async () => {
    const offerPath = path.join(DATA_DIR, 'jobs', 'job-abc', 'offer.json')
    writeJson(offerPath, { tags: ['Python', 'Django', 'Docker'] })
    setupEmpty()
    dirs.set(path.join(DATA_DIR, 'jobs'), ['job-abc'])

    const count = await purgeTagAliases(['Django'])
    expect(count).toBe(1)
    expect(readJson(offerPath).tags).toEqual(['Python', 'Docker'])
  })

  it('removes tags from general-question json files', async () => {
    const gqPath = path.join(DATA_DIR, 'general-questions', 'gq-001.json')
    writeJson(gqPath, { tags: ['leadership', 'teamwork'] })
    setupEmpty()
    dirs.set(path.join(DATA_DIR, 'general-questions'), ['gq-001.json'])

    const count = await purgeTagAliases(['leadership'])
    expect(count).toBe(1)
    expect(readJson(gqPath).tags).toEqual(['teamwork'])
  })

  it('does not modify files that do not match', async () => {
    const metaPath = path.join(DATA_DIR, 'entities', 'skills', 'skil-001', 'meta.json')
    writeJson(metaPath, { tags: ['Rust', 'C'] })
    setupEmpty()
    dirs.set(path.join(DATA_DIR, 'entities', 'skills'), ['skil-001'])

    const count = await purgeTagAliases(['Python'])
    expect(count).toBe(0)
    expect(readJson(metaPath).tags).toEqual(['Rust', 'C'])
  })

  it('skips files without a tags field', async () => {
    const offerPath = path.join(DATA_DIR, 'jobs', 'job-xyz', 'offer.json')
    writeJson(offerPath, { title: 'Offer without tags' })
    setupEmpty()
    dirs.set(path.join(DATA_DIR, 'jobs'), ['job-xyz'])

    const count = await purgeTagAliases(['Python'])
    expect(count).toBe(0)
  })

  it('handles multiple files updated in one call', async () => {
    const exp = path.join(DATA_DIR, 'entities', 'experiences', 'exp-1', 'meta.json')
    const proj = path.join(DATA_DIR, 'entities', 'projects', 'proj-1', 'meta.json')
    writeJson(exp, { tags: ['React', 'Docker'] })
    writeJson(proj, { tags: ['Docker', 'Kubernetes'] })
    setupEmpty()
    dirs.set(path.join(DATA_DIR, 'entities', 'experiences'), ['exp-1'])
    dirs.set(path.join(DATA_DIR, 'entities', 'projects'), ['proj-1'])

    const count = await purgeTagAliases(['Docker'])
    expect(count).toBe(2)
    expect(readJson(exp).tags).toEqual(['React'])
    expect(readJson(proj).tags).toEqual(['Kubernetes'])
  })
})
