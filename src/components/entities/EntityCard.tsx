'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import type { EntityMeta } from '@/types'

function entityTitle(e: EntityMeta): string {
  if (e.type === 'skills') return e.name
  if (e.type === 'education') return e.degree
  return e.title
}

function entitySubtitle(e: EntityMeta): string {
  if (e.type === 'experiences') return e.company
  if (e.type === 'projects') return e.tech.join(', ')
  if (e.type === 'education') return e.institution
  return e.level
}

const TYPE_LABELS: Record<string, string> = {
  experiences: 'Experience',
  projects: 'Project',
  skills: 'Skill',
  education: 'Education',
}

export function EntityCard({ entity }: { entity: EntityMeta }) {
  return (
    <Link
      href={`/entities/${entity.type}/${entity.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-400 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
          {entityTitle(entity)}
        </span>
        <Badge label={TYPE_LABELS[entity.type]} />
      </div>

      {entitySubtitle(entity) && (
        <p className="text-sm text-slate-500 mb-2">{entitySubtitle(entity)}</p>
      )}

      {entity.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {entity.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} label={tag} variant="muted" />
          ))}
          {entity.tags.length > 4 && (
            <span className="text-xs text-slate-400">+{entity.tags.length - 4}</span>
          )}
        </div>
      )}
    </Link>
  )
}
