import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import { hashPassword, SALT_ROUNDS, UNKNOWN_ACCOUNT_HASH, verifyPassword } from './password'

describe('hashPassword / verifyPassword', () => {
  it('never returns the plain password as the hash', async () => {
    const hash = await hashPassword('mySecret123')
    expect(hash).not.toBe('mySecret123')
  })

  it('produces a different hash for the same password each time (unique salt)', async () => {
    const hash1 = await hashPassword('mySecret123')
    const hash2 = await hashPassword('mySecret123')
    expect(hash1).not.toBe(hash2)
  })

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('mySecret123')
    expect(await verifyPassword('mySecret123', hash)).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('mySecret123')
    expect(await verifyPassword('wrongPassword', hash)).toBe(false)
  })
})

describe('UNKNOWN_ACCOUNT_HASH (#225)', () => {
  it('costs as much as a real hash: if SALT_ROUNDS changes, the time of the answer would tell which accounts exist', async () => {
    expect(bcrypt.getRounds(UNKNOWN_ACCOUNT_HASH)).toBe(SALT_ROUNDS)
    expect(bcrypt.getRounds(await hashPassword('mySecret123'))).toBe(SALT_ROUNDS)
  })

  it('is a valid hash that no password matches', async () => {
    expect(await verifyPassword('', UNKNOWN_ACCOUNT_HASH)).toBe(false)
    expect(await verifyPassword('password', UNKNOWN_ACCOUNT_HASH)).toBe(false)
  })
})
