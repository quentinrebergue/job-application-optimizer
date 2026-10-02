import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth/session'
import { RenderError, listTemplates } from '@/lib/resume/renderer-client'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json({ templates: await listTemplates() })
  } catch (err) {
    if (!(err instanceof RenderError)) throw err
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
  }
}
