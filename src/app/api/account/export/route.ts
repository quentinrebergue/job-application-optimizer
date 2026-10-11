import { NextResponse } from 'next/server'
import { exportAccount } from '@/lib/data/account'
import { findPasswordHash, findUserById } from '@/lib/data/users'
import { noticeDataExported } from '@/lib/account-notice'
import { verifyPassword } from '@/lib/auth/password'
import { consumeRateLimit } from '@/lib/rate-limit'
import { getSessionUserId } from '@/lib/auth/session'
import { ExportAccountSchema } from '@/schemas/inputs'
import { readJson } from '@/lib/validation/read-json'

const PER_HOUR = 10

// One JSON file with everything the app holds about the user (#104, the right of access and of portability).
// A POST with the password, not a GET: a session left open on a shared computer cannot take the data, and the
// origin check of the proxy covers it (a page of another site cannot trigger the download). The owner gets a mail.
export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await readJson(request, ExportAccountSchema)
  if (!body.ok) return body.response
  const { allowed } = await consumeRateLimit(`account-export:${userId}`, PER_HOUR, 3_600_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a while.', code: 'rate_limited' }, { status: 429 })
  }
  const hash = await findPasswordHash(userId)
  if (!hash || !(await verifyPassword(body.data.password, hash))) {
    return NextResponse.json({ error: 'Wrong password.', code: 'wrong_password' }, { status: 400 })
  }
  const data = await exportAccount(userId)
  const user = await findUserById(userId)
  if (!data || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await noticeDataExported(userId, user.email)
  const day = data.exported_at.slice(0, 10)
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="fastresume-export-${day}.json"`,
      // Personal data: never kept by a cache.
      'cache-control': 'no-store',
    },
  })
}
