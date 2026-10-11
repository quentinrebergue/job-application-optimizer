// The links sent by mail against a real Postgres (#221): single use, even for two requests at once, a purpose of
// their own, an expiry, and only a hash stored.
import { it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'
import { consumeEmailToken, countRecentTokens, createEmailToken, hashToken, invalidateEmailTokens, peekEmailToken } from './email-tokens'

const HOUR = 3_600_000
let pool: Pool
let user: string

dbDescribe('email tokens on Postgres', () => {
  beforeAll(async () => {
    pool = await getPool()
  })
  beforeEach(async () => {
    await resetData(pool)
    user = await makeUser(pool)
  })
  afterAll(async () => {
    await pool.end()
  })

  it('stores the hash of the link and not the link: a leaked table gives nothing to click', async () => {
    const token = await createEmailToken(user, 'verify', HOUR)
    const { rows } = await pool.query('SELECT token_hash FROM email_tokens')
    expect(rows).toEqual([{ token_hash: hashToken(token) }])
    expect(JSON.stringify(rows)).not.toContain(token)
  })

  it('gives the user of a link once, then says it was used', async () => {
    const token = await createEmailToken(user, 'verify', HOUR)
    expect(await consumeEmailToken(token, 'verify')).toEqual({ userId: user })
    expect(await consumeEmailToken(token, 'verify')).toEqual({ failure: 'used' })
  })

  it('lets exactly one of two requests at once use the same link', async () => {
    const token = await createEmailToken(user, 'reset', HOUR)
    const results = await Promise.all(Array.from({ length: 5 }, () => consumeEmailToken(token, 'reset')))
    expect(results.filter((r) => 'userId' in r)).toHaveLength(1)
    expect(results.filter((r) => 'failure' in r)).toHaveLength(4)
  })

  it('tells an unknown link, a link of another purpose, and an expired one apart', async () => {
    const verify = await createEmailToken(user, 'verify', HOUR)
    expect(await consumeEmailToken('made-up', 'verify')).toEqual({ failure: 'invalid' })
    expect(await consumeEmailToken(verify, 'reset')).toEqual({ failure: 'invalid' })
    const old = await createEmailToken(user, 'verify', -1000)
    expect(await consumeEmailToken(old, 'verify')).toEqual({ failure: 'expired' })
    // and the valid one was not touched by those refusals
    expect(await consumeEmailToken(verify, 'verify')).toEqual({ userId: user })
  })

  it('looks without using: a mail scanner that opens the link does not spend it', async () => {
    const token = await createEmailToken(user, 'reset', HOUR)
    expect(await peekEmailToken(token, 'reset')).toEqual({ userId: user })
    expect(await peekEmailToken(token, 'reset')).toEqual({ userId: user })
    expect(await consumeEmailToken(token, 'reset')).toEqual({ userId: user })
    expect(await peekEmailToken(token, 'reset')).toEqual({ failure: 'used' })
  })

  it('stops the older links of a purpose, and only that purpose', async () => {
    const older = await createEmailToken(user, 'reset', HOUR)
    const verify = await createEmailToken(user, 'verify', HOUR)
    await invalidateEmailTokens(user, 'reset')
    expect(await consumeEmailToken(older, 'reset')).toEqual({ failure: 'used' })
    expect(await consumeEmailToken(verify, 'verify')).toEqual({ userId: user })
  })

  it('counts the links sent to a user since a time, for the limit on resends', async () => {
    const other = await makeUser(pool)
    await createEmailToken(user, 'verify', HOUR)
    await createEmailToken(user, 'verify', HOUR)
    await createEmailToken(user, 'reset', HOUR)
    await createEmailToken(other, 'verify', HOUR)
    const since = new Date(Date.now() - HOUR)
    const verify = await countRecentTokens(user, 'verify', since)
    expect(verify.count).toBe(2)
    expect(verify.latest).toBeInstanceOf(Date)
    expect((await countRecentTokens(user, 'reset', since)).count).toBe(1)
    expect(await countRecentTokens(user, 'verify', new Date(Date.now() + HOUR))).toEqual({ count: 0, latest: null })
  })
})
