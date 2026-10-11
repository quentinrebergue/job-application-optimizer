import { NextResponse } from 'next/server'
import { requestEmailChange } from '@/lib/auth/credentials'
import { getSessionUserId } from '@/lib/auth/session'
import { ChangeEmailSchema } from '@/schemas/inputs'
import { readJson } from '@/lib/validation/read-json'

// Asks to change the address of the signed-in user (#236): the password is asked, a link goes to the new
// address, and the account changes address only when it is opened (/verify-email/change).
export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await readJson(request, ChangeEmailSchema)
  if (!body.ok) return body.response
  try {
    const result = await requestEmailChange(userId, body.data.password, body.data.email)
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status })
    return NextResponse.json({ sent: true, email: result.email })
  } catch (err) {
    console.error('request email change failed', err)
    return NextResponse.json({ error: 'The address could not be changed. Try again.' }, { status: 500 })
  }
}
