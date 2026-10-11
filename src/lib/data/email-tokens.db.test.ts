// The links sent by mail against a real Postgres (#221): single use, even for two requests at once, a purpose of
// their own, an expiry, and only a hash stored.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { dbDescribe, getPool, makeUser, resetData } from '@/tests/db/helpers'
import {
  consumeEmailChangeToken,
  consumeEmailToken,
  countRecentTokens,
  createEmailToken,
  deleteExpiredEmailTokens,
  hashToken,
  invalidateEmailTokens,
  peekEmailChangeToken,
  peekEmailToken,
} from './email-tokens'

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

  describe('the link of a change of address (#236)', () => {
    it('carries the new address and gives it back once, even to two requests at once', async () => {
      const token = await createEmailToken(user, 'change-email', HOUR, 'new@example.test')
      const results = await Promise.all([consumeEmailChangeToken(token), consumeEmailChangeToken(token)])
      expect(results.filter((r) => 'newEmail' in r)).toEqual([{ userId: user, newEmail: 'new@example.test' }])
      expect(await consumeEmailChangeToken(token)).toEqual({ failure: 'used' })
    })

    it('is not a link of confirmation or of reset, and those are not a change of address', async () => {
      const change = await createEmailToken(user, 'change-email', HOUR, 'new@example.test')
      expect(await consumeEmailToken(change, 'verify')).toEqual({ failure: 'invalid' })
      expect(await consumeEmailToken(change, 'reset')).toEqual({ failure: 'invalid' })
      const verify = await createEmailToken(user, 'verify', HOUR)
      expect(await consumeEmailChangeToken(verify)).toEqual({ failure: 'invalid' })
    })

    it('does not work once expired, and a link of another purpose cannot carry an address by mistake', async () => {
      const old = await createEmailToken(user, 'change-email', -1000, 'new@example.test')
      expect(await consumeEmailChangeToken(old)).toEqual({ failure: 'expired' })
      const noAddress = await createEmailToken(user, 'change-email', HOUR)
      expect(await consumeEmailChangeToken(noAddress)).toMatchObject({ failure: expect.any(String) })
    })

    it('is made useless by asking again: invalidating the links of this purpose leaves the others alone', async () => {
      const first = await createEmailToken(user, 'change-email', HOUR, 'a@example.test')
      const reset = await createEmailToken(user, 'reset', HOUR)
      await invalidateEmailTokens(user, 'change-email')
      expect(await consumeEmailChangeToken(first)).toEqual({ failure: 'used' })
      expect(await consumeEmailToken(reset, 'reset')).toEqual({ userId: user })
    })
  })

  describe('reading a link of a change of address without using it, and cleaning up (#236)', () => {
    it('gives the address without using the link, as often as asked: a scanner that opens it changes nothing', async () => {
      const token = await createEmailToken(user, 'change-email', HOUR, 'new@example.test')
      expect(await peekEmailChangeToken(token)).toEqual({ userId: user, newEmail: 'new@example.test' })
      expect(await peekEmailChangeToken(token)).toEqual({ userId: user, newEmail: 'new@example.test' })
      expect(await consumeEmailChangeToken(token)).toEqual({ userId: user, newEmail: 'new@example.test' })
      expect(await peekEmailChangeToken(token)).toEqual({ failure: 'used' })
    })

    it('refuses a link of another purpose and an expired one', async () => {
      expect(await peekEmailChangeToken(await createEmailToken(user, 'verify', HOUR))).toEqual({ failure: 'invalid' })
      expect(await peekEmailChangeToken(await createEmailToken(user, 'change-email', -1000, 'new@example.test'))).toEqual({ failure: 'expired' })
    })

    it('deletes the tokens that expired more than a day ago, with the address they carried, and only those', async () => {
      const dayAgoPlus = await createEmailToken(user, 'change-email', -(25 * HOUR), 'typed-by-someone@example.test')
      const justExpired = await createEmailToken(user, 'change-email', -1000, 'recent@example.test')
      const valid = await createEmailToken(user, 'change-email', HOUR, 'valid@example.test')
      expect(await deleteExpiredEmailTokens()).toBe(1)
      const { rows } = await pool.query('SELECT token_hash FROM email_tokens ORDER BY token_hash')
      expect(rows.map((r) => r.token_hash).sort()).toEqual([hashToken(justExpired), hashToken(valid)].sort())
      expect(JSON.stringify(rows)).not.toContain(hashToken(dayAgoPlus))
      // A link just expired still says so: it was not cleaned up yet.
      expect(await peekEmailChangeToken(justExpired)).toEqual({ failure: 'expired' })
    })
  })
})
