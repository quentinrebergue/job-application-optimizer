import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntityCard } from '@/components/entities/EntityCard'
import { listEntities } from '@/lib/data'
import { ENTITY_TYPE_CONFIGS } from '@/config'
import type { EntityType } from '@/types'
import { verifySession } from '@/lib/auth/dal'

const VALID_TYPES = new Set<EntityType>(['experiences', 'projects', 'skills', 'education'])

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ type: string }>
}

export default async function EntityTypePage({ params }: Props) {
  const { userId } = await verifySession()
  const { type } = await params

  if (!VALID_TYPES.has(type as EntityType)) {
    notFound()
  }

  const entityType = type as EntityType
  const config = ENTITY_TYPE_CONFIGS.find((c) => c.id === entityType)!

  const entities = await listEntities(userId, entityType).catch(() => [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/entities"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          All entities
        </Link>
        <PageHeader
          title={config.label}
          subtitle={`${entities.length} ${config.labelSingular.toLowerCase()}${entities.length !== 1 ? 's' : ''} in your library`}
        >
          <Link
            href={`/entities/new?type=${entityType}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Add {config.labelSingular}
          </Link>
        </PageHeader>
      </div>

      {/* Entity list */}
      {entities.length > 0 ? (
        <div className="grid gap-4">
          {entities.map((entity) => (
            <EntityCard key={entity.id} entity={entity} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <p className="text-sm text-slate-500">No {config.label.toLowerCase()} yet.</p>
          <Link
            href={`/entities/new?type=${entityType}`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Add your first {config.labelSingular.toLowerCase()}
          </Link>
        </div>
      )}
    </div>
  )
}
