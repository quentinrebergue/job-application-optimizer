'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { DirectionPreview, type Direction } from './DirectionPreview'

const DIRECTIONS: Direction[] = [
  {
    id: 'flat',
    name: 'Current',
    summary: 'Flat, 1px hairline borders, 6px corners, no shadow. Calm, dense, serious.',
  },
  {
    id: 'tempered',
    name: 'Tempered neo-brutalism',
    summary: '2px ink strokes on actions and navigation, 2px corners, hard shadow only on what you click. Red stays the only action colour.',
  },
  {
    id: 'full',
    name: 'Full neo-brutalism',
    summary: 'Thick strokes and hard shadows everywhere, warm page, several saturated flat colours, extra-bold headings.',
  },
]

export function DirectionComparison() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="UI direction"
        subtitle="The same elements in three directions, to choose before migrating more pages (#85). Development only."
      >
        <Link href="/ui" className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          Current catalogue
        </Link>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-3">
        {DIRECTIONS.map((direction) => (
          <DirectionPreview key={direction.id} direction={direction} />
        ))}
      </div>
    </div>
  )
}
