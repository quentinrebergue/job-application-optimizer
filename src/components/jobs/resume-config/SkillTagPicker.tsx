'use client'

import { useId, useState } from 'react'
import type { SkillMeta } from '@/types'
import type { SuggestedSkillTag } from '@/types/job'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LIMITS } from '@/config/limits'
import { eyebrow, focusRing } from '@/components/ui/styles'

interface Props {
  skill: SkillMeta
  /** Tags printed for this job */
  selected: string[]
  /** Every tag used in the library, offered when adding one */
  libraryTags: string[]
  suggestions: SuggestedSkillTag[]
  /** Key of the library change in progress (`skillId:tag`), if any */
  busy: string | null
  onToggle: (tag: string) => void
  /** Adds a tag to the skill in the library; `select` also prints it in this resume */
  onAdd: (tag: string, select: boolean) => void
}

/** Which tags of a skill go into this resume, and adding tags to the library. */
export function SkillTagPicker({ skill, selected, libraryTags, suggestions, busy, onToggle, onAdd }: Props) {
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const listId = useId()
  const shown = Array.from(new Set([...skill.tags, ...selected]))
  const offered = libraryTags.filter((t) => !skill.tags.includes(t))

  function submit() {
    const tag = query.trim()
    if (tag) onAdd(tag, false)
    setQuery('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-row">
      <p className={eyebrow}>Tags printed in this resume</p>
      <div role="group" aria-label={`Tags of ${skill.name}`} className="flex flex-wrap items-center gap-2">
        {shown.map((tag) => {
          const on = selected.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(tag)}
              className={cn(
                'text-label rounded-control border-2 px-2 py-0.5 transition-colors',
                focusRing,
                on ? 'border-ink bg-ink text-surface' : 'border-dashed border-ink bg-surface text-ink-muted hover:text-ink',
              )}
            >
              {tag}
            </button>
          )
        })}

        {adding ? (
          <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex items-center gap-2">
            <Input
              autoFocus
              aria-label={`New tag for ${skill.name}`}
              list={listId}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setAdding(false); setQuery('') } }}
              maxLength={LIMITS.tag}
              placeholder="Search or create"
              className="h-8 w-44"
            />
            <datalist id={listId}>
              {offered.map((t) => <option key={t} value={t} />)}
            </datalist>
            <Button type="submit" size="sm" variant="secondary" disabled={!query.trim()}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setQuery('') }}>Cancel</Button>
          </form>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)} disabled={busy?.startsWith(`${skill.id}:`)}>
            + Tag
          </Button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2 border-t-2 border-dashed border-ink pt-row">
          <p className={eyebrow}>The AI suggests adding</p>
          {suggestions.map((s) => (
            <div key={s.tag} className="flex flex-wrap items-center gap-2 text-small">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onAdd(s.tag, true)}
                disabled={busy === `${skill.id}:${s.tag}` || skill.tags.includes(s.tag)}
              >
                + {s.tag}
              </Button>
              {s.reason && <span className="text-ink-muted">{s.reason}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
