import { NextResponse } from 'next/server'
import { getJobCoverLetter, saveJobCoverLetter } from '@/lib/data/cover-letter'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const config = await getJobCoverLetter(id)
  return NextResponse.json(config)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  await saveJobCoverLetter(id, body)
  return NextResponse.json(body)
}
