// The profile of a user against a real Postgres (#221): one row per user, saved again in place, never shared.
import { it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'
import { getResumeProfile, saveResumeProfile } from './resume-profile'

let pool: Pool
let alice: string
let bob: string

const profile = { full_name: 'Ada Lovelace', email: 'ada@example.test', linkedin: 'linkedin.com/in/ada', github: 'github.com/ada', phone: '+33 6 00 00 00 00', address: 'Paris', resume_title: 'Engineer', profile_text: 'Hello', ai_context: '' }

dbDescribe('the resume profile on Postgres', () => {
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

  const rowCount = async () => (await pool.query('SELECT count(*)::int AS n FROM user_resume_profile')).rows[0].n

  it('is empty until saved, without creating a row by being read', async () => {
    expect(await getResumeProfile(alice)).toEqual({ full_name: '', email: '', linkedin: '', github: '', phone: '', address: '', resume_title: '', profile_text: '', ai_context: '' })
    expect(await rowCount()).toBe(0)
  })

  it('saves the profile and reads back what was saved', async () => {
    expect(await saveResumeProfile(alice, profile)).toEqual(profile)
    expect(await getResumeProfile(alice)).toEqual(profile)
  })

  it('saves again in place: one row per user, the new values, a later update date', async () => {
    await saveResumeProfile(alice, profile)
    const first = (await pool.query('SELECT updated_at FROM user_resume_profile')).rows[0].updated_at
    await new Promise((resolve) => setTimeout(resolve, 20))
    await saveResumeProfile(alice, { ...profile, full_name: 'Ada King' })
    expect(await rowCount()).toBe(1)
    expect((await getResumeProfile(alice)).full_name).toBe('Ada King')
    expect((await pool.query('SELECT updated_at FROM user_resume_profile')).rows[0].updated_at.getTime()).toBeGreaterThan(first.getTime())
  })

  it('keeps one user\'s profile from another', async () => {
    await saveResumeProfile(alice, profile)
    await saveResumeProfile(bob, { ...profile, full_name: 'Bob' })
    expect((await getResumeProfile(alice)).full_name).toBe('Ada Lovelace')
    expect((await getResumeProfile(bob)).full_name).toBe('Bob')
    expect(await rowCount()).toBe(2)
  })

  it('keeps a long text whole', async () => {
    const text = 'a'.repeat(5000)
    await saveResumeProfile(alice, { ...profile, profile_text: text })
    expect((await getResumeProfile(alice)).profile_text).toBe(text)
  })

  it('refuses a profile for a user that does not exist', async () => {
    await expect(saveResumeProfile('00000000-0000-0000-0000-000000000000', profile)).rejects.toThrow()
  })
})
