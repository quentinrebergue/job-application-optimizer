import { NextResponse } from 'next/server'
import { deleteAccount } from '@/lib/data/account'
import { noticeAccountDeleted } from '@/lib/account-notice'
import { findPasswordHash, findUserById } from '@/lib/data/users'
import { verifyPassword } from '@/lib/auth/password'
import { consumeRateLimit } from '@/lib/rate-limit'
import { deleteSession, getSessionUserId } from '@/lib/auth/session'
import { DeleteAccountSchema } from '@/schemas/inputs'
import { readJson } from '@/lib/validation/read-json'

const PER_HOUR = 5

// Deletes the account and all its data (#104, the right of erasure). The user types their address again
// (a click on the wrong button deletes nothing) and gives their password (a session left open on a shared
// computer cannot delete the account). The owner gets a mail.
export async function DELETE(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await readJson(request, DeleteAccountSchema)
  if (!body.ok) return body.response
  const { allowed } = await consumeRateLimit(`account-delete:${userId}`, PER_HOUR, 3_600_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a while.', code: 'rate_limited' }, { status: 429 })
  }
  const user = await findUserById(userId)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (body.data.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'That is not the email of this account.', code: 'email_mismatch' }, { status: 400 })
  }
  const hash = await findPasswordHash(userId)
  if (!hash || !(await verifyPassword(body.data.password, hash))) {
    return NextResponse.json({ error: 'Wrong password.', code: 'wrong_password' }, { status: 400 })
  }
  try {
    await deleteAccount(userId)
  } catch (err) {
    console.error('delete account failed', err)
    return NextResponse.json({ error: 'The account could not be deleted. Try again.' }, { status: 500 })
  }
  noticeAccountDeleted(user.email)
  // The session rows went with the account; this removes the cookie of this browser.
  await deleteSession()
  return NextResponse.json({ deleted: true })
}
