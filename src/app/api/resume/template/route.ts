import { NextResponse } from 'next/server'
import { getTemplate, saveTemplate } from '@/lib/latex'

export async function GET() {
  try {
    const content = await getTemplate()
    return NextResponse.json({ content })
  } catch {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { content?: string }
  if (typeof body.content !== 'string') {
    return NextResponse.json({ error: 'content string is required' }, { status: 400 })
  }
  await saveTemplate(body.content)
  return NextResponse.json({ ok: true })
}
