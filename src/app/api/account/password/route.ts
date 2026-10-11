import { NextResponse } from 'next/server'
import { changePassword } from '@/lib/auth/credentials'
import { getSessionUserId } from '@/lib/auth/session'
import { ChangePasswordSchema } from '@/schemas/inputs'
import { readJson } from '@/lib/validation/read-json'

// Changes the password of the signed-in user (#236): the current one is asked, the other devices are signed out.
export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await readJson(request, ChangePasswordSchema)
  if (!body.ok) return body.response
  try {
    const result = await changePassword(userId, body.data.currentPassword, body.data.newPassword)
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status })
    return NextResponse.json({ changed: true })
  } catch (err) {
    console.error('change password failed', err)
    return NextResponse.json({ error: 'The password could not be changed. Try again.' }, { status: 500 })
  }
}
