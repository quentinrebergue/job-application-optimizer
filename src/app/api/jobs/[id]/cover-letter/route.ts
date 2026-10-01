import { NextResponse } from 'next/server'
import { getJobCoverLetter, saveJobCoverLetter } from '@/lib/data/cover-letter'
import { getSessionUserId } from '@/lib/auth/session'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const config = await getJobCoverLetter(userId, id)
  return NextResponse.json(config)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  await saveJobCoverLetter(userId, id, body)
  return NextResponse.json(body)
}
