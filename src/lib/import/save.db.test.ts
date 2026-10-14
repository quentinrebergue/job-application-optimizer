// The import of a resume against a real Postgres (#267): what is added, what is not, and what stays.
import { it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'
import { countEntities, createEntity, getResumeProfile, listEntities, saveResumeProfile } from '@/lib/data'
import { MAX_ENTRIES } from '@/config/limits'
import type { ImportedEntries } from '@/lib/ai/import-prompt'
import { saveImportedEntries, saveImportedProfile } from './save'

let pool: Pool
let alice: string
let bob: string

const none: ImportedEntries = { experiences: [], projects: [], education: [], skills: [] }
const experience = { title: 'Backend engineer', company: 'Logistix', location: 'Lyon', period: '2022 – Present', description: 'Built an API', tags: ['Go'] }

dbDescribe('importing a resume on Postgres', () => {
  beforeAll(async () => {
    pool = await getPool()
  })
  beforeEach(async () => {
    await resetData(pool)
    alice = await makeUser(pool)
    bob = await makeUser(pool)
  })
  afterAll(async () => {
    await pool.end()
  })

  it('adds the entries of every kind to the library of the user, and only theirs', async () => {
    const { summary, created } = await saveImportedEntries(alice, {
      experiences: [experience],
      projects: [{ title: 'Queue', tech: ['Go'], description: 'x', tags: [] }],
      education: [{ degree: 'MSc', institution: 'INSA Lyon', period: '2013 – 2018', tags: [] }],
      skills: [{ name: 'Go', category: 'Languages', level: 'advanced', tags: [] }],
    })
    expect(summary.experiences).toEqual({ added: 1, duplicates: 0, overCap: 0 })
    expect(created.map((e) => e.type).sort()).toEqual(['education', 'experiences', 'projects', 'skills'])
    expect(await listEntities(alice, 'experiences')).toMatchObject([{ title: 'Backend engineer', company: 'Logistix', tags: ['Go'] }])
    expect(await countEntities(alice, 'skills')).toBe(1)
    expect(await countEntities(bob, 'experiences')).toBe(0)
  })

  it('does not add an entry twice: importing the same resume again changes nothing', async () => {
    await saveImportedEntries(alice, { ...none, experiences: [experience] })
    const second = await saveImportedEntries(alice, { ...none, experiences: [{ ...experience, title: '  BACKEND   engineer ' }] })
    const again = second.summary
    expect(again.experiences).toEqual({ added: 0, duplicates: 1, overCap: 0 })
    expect(second.created).toEqual([])
    expect(await countEntities(alice, 'experiences')).toBe(1)
  })

  it('gives back the entries of the library that the resume holds again, once each', async () => {
    const first = await saveImportedEntries(alice, { ...none, experiences: [experience] })
    const again = await saveImportedEntries(alice, { ...none, experiences: [experience, experience] })
    expect(again.created).toEqual([])
    expect(again.existing.map((e) => e.id)).toEqual([first.created[0].id])
  })

  it('does not add the same entry twice within one resume', async () => {
    const { summary } = await saveImportedEntries(alice, { ...none, experiences: [experience, experience] })
    expect(summary.experiences).toEqual({ added: 1, duplicates: 1, overCap: 0 })
  })

  it('leaves what the user already has alone, and keeps the cap of the library', async () => {
    for (let i = 0; i < MAX_ENTRIES.experiences - 1; i++) {
      await createEntity(alice, 'experiences', { title: `Job ${i}`, company: 'Acme', period: '', description: '', tags: [] } as never)
    }
    const { summary } = await saveImportedEntries(alice, {
      ...none,
      experiences: [experience, { ...experience, title: 'Another job' }, { ...experience, title: 'A third job' }],
    })
    expect(summary.experiences).toEqual({ added: 1, duplicates: 0, overCap: 2 })
    expect(await countEntities(alice, 'experiences')).toBe(MAX_ENTRIES.experiences)
  })

  it('does not take a user over a cap they are already over: only adding is refused', async () => {
    for (let i = 0; i < MAX_ENTRIES.skills + 2; i++) {
      await createEntity(alice, 'skills', { name: `Skill ${i}`, category: 'Tools', level: 'beginner', tags: [] } as never)
    }
    const { summary } = await saveImportedEntries(alice, { ...none, skills: [{ name: 'Go', category: 'Languages', level: 'expert', tags: [] }] })
    expect(summary.skills).toEqual({ added: 0, duplicates: 0, overCap: 1 })
    expect(await countEntities(alice, 'skills')).toBe(MAX_ENTRIES.skills + 2)
  })

  it('fills the empty fields of the profile and never the ones the user typed', async () => {
    const empty = await getResumeProfile(alice)
    await saveResumeProfile(alice, { ...empty, full_name: 'Alice as she typed it', phone: '' })
    const { filled, different } = await saveImportedProfile(alice, { full_name: 'Camille Moreau', phone: '+33 6 12 34 56 78', email: 'camille@example.com' })
    expect(filled.sort()).toEqual(['email', 'phone'])
    // What the user typed is kept, and what the resume says instead is given back to be shown.
    expect(different).toEqual({ full_name: 'Camille Moreau' })
    expect(await getResumeProfile(alice)).toMatchObject({ full_name: 'Alice as she typed it', phone: '+33 6 12 34 56 78', email: 'camille@example.com' })
    expect((await getResumeProfile(bob)).email).toBe('')
  })

  it('does not call a profile field different when the resume says the same thing', async () => {
    const empty = await getResumeProfile(alice)
    await saveResumeProfile(alice, { ...empty, email: 'Camille@Example.com' })
    expect((await saveImportedProfile(alice, { email: ' camille@example.com ' })).different).toEqual({})
  })

  it('writes nothing when there is nothing to fill', async () => {
    expect(await saveImportedProfile(alice, {})).toEqual({ filled: [], different: {} })
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM user_resume_profile WHERE user_id = $1', [alice])
    expect(rows[0].n).toBe(0)
  })
})
