'use client'

import { SectionTitle } from '@/components/ui/SectionTitle'
import type { EntityMeta, SkillMeta } from '@/types'
import type { SuggestedSkill } from '@/types/job'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface Props {
  suggestions: SuggestedSkill[]
  entities: EntityMeta[]
  /** Name of the skill being added, if any */
  busy: string | null
  onAdd: (suggestion: SuggestedSkill) => void
}

/** Skills the AI thinks this job asks for and the library does not have yet. */
export function SuggestedSkills({ suggestions, entities, busy, onAdd }: Props) {
  if (suggestions.length === 0) return null
  const has = (name: string) =>
    entities.some((e) => e.type === 'skills' && (e as SkillMeta).name.toLowerCase() === name.toLowerCase())

  return (
    <section aria-labelledby="suggested-skills" className="flex flex-col gap-heading">
      <SectionTitle as="h4" id="suggested-skills">Skills to add to your library</SectionTitle>
      <ul className="flex flex-col gap-row">
        {suggestions.map((s) => {
          const exists = has(s.name)
          return (
            <li key={s.name} className="flex flex-wrap items-start gap-inline rounded-control border-2 border-dashed border-ink bg-surface p-row">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.name}</p>
                <p className="text-caption text-ink-muted">{s.category}</p>
                {s.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.tags.map((t) => <Badge key={t} label={t} variant="muted" />)}
                  </div>
                )}
                <p className="mt-2 text-caption text-ink-muted">{s.reason}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => onAdd(s)} disabled={exists || busy === s.name}>
                {exists ? 'In your library' : busy === s.name ? 'Adding…' : 'Add to library'}
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
