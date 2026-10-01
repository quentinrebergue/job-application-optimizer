import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

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
