import { NextResponse } from 'next/server'
import { ENTITY_SECTION_TYPES, type EntitySectionType } from '@/config'
import { getEntityTemplate, saveEntityTemplate } from '@/lib/latex'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  if (!(ENTITY_SECTION_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: `Unknown entity type: ${type}` }, { status: 400 })
  }
  try {
    const content = await getEntityTemplate(type as EntitySectionType)
    return NextResponse.json({ type, content })
  } catch {
    return NextResponse.json({ error: 'Entity template not found' }, { status: 404 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  if (!(ENTITY_SECTION_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: `Unknown entity type: ${type}` }, { status: 400 })
  }
  const body = (await request.json()) as { content?: string }
  if (typeof body.content !== 'string') {
    return NextResponse.json({ error: 'content string is required' }, { status: 400 })
  }
  await saveEntityTemplate(type as EntitySectionType, body.content)
  return NextResponse.json({ type, ok: true })
}
