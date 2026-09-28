import { NextResponse } from 'next/server'
import { updateNode, deleteNode, addAlias, removeAlias } from '@/lib/data'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, ...patch } = body as {
      action?: 'add_alias' | 'remove_alias'
      alias?: string
      label?: string
      parent?: string | null
      aliases?: string[]
      description?: string
    }

    if (action === 'add_alias') {
      if (!patch.alias) return NextResponse.json({ error: 'alias required' }, { status: 400 })
      const node = await addAlias(id, patch.alias)
      if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 })
      return NextResponse.json(node)
    }

    if (action === 'remove_alias') {
      if (!patch.alias) return NextResponse.json({ error: 'alias required' }, { status: 400 })
      const node = await removeAlias(id, patch.alias)
      if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 })
      return NextResponse.json(node)
    }

    const node = await updateNode(id, patch)
    if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    return NextResponse.json(node)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const cascade = searchParams.get('cascade') === 'true'
    const ok = await deleteNode(id, cascade)
    if (!ok) return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Delete failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
