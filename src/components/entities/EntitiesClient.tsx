'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntityCard } from '@/components/entities/EntityCard'
import type { EntityMeta, EntityType } from '@/types'

const TABS: { label: string; value: EntityType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Experiences', value: 'experiences' },
  { label: 'Projects', value: 'projects' },
  { label: 'Skills', value: 'skills' },
  { label: 'Education', value: 'education' },
]
const VALID = new Set(TABS.map((t) => t.value))

interface Props { initialEntities: EntityMeta[] }

export function EntitiesClient({ initialEntities }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawTab = searchParams.get('tab') ?? 'all'
  const tab: EntityType | 'all' = (VALID.has(rawTab as EntityType | 'all') ? rawTab : 'all') as EntityType | 'all'

  function setTab(value: EntityType | 'all') {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete('tab')
    else params.set('tab', value)
    router.replace(`/entities?${params.toString()}`)
  }

  const filtered = tab === 'all' ? initialEntities : initialEntities.filter((e) => e.type === tab)

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <PageHeader
        title="Entity Library"
        subtitle="Your experiences, projects, and skills — the building blocks of your resume."
      >
        <Link
          href="/entities/new"
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Entity
        </Link>
      </PageHeader>

      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => {
          const count = t.value === 'all'
            ? initialEntities.length
            : initialEntities.filter((e) => e.type === t.value).length
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                tab === t.value
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900',
              ].join(' ')}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-slate-400">({count})</span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
          <p className="text-slate-500 mb-3">No entities here yet.</p>
          <Link
            href="/entities/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Create your first entity
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <EntityCard key={e.id} entity={e} />
          ))}
        </div>
      )}
    </div>
  )
}
