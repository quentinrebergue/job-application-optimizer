import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const PROGRESS_FILE = path.join(process.cwd(), 'data', 'coding', 'progress.json')

async function getProgress(): Promise<string[]> {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveProgress(ids: string[]): Promise<void> {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(ids, null, 2))
}

export async function GET() {
  const ids = await getProgress()
  return NextResponse.json(ids)
}

export async function POST(request: Request) {
  try {
    const { ids } = (await request.json()) as { ids: string[] }
    if (!Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'ids must be an array' },
        { status: 400 }
      )
    }
    await saveProgress(ids)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to save progress:', err)
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    )
  }
}
