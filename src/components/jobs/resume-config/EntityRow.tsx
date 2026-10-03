'use client'

import { ChevronDown } from 'lucide-react'
import type { EntityMeta } from '@/types'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { entityLabel, entitySubLabel } from './logic'

export interface RowState {
  selected: boolean
  expanded: boolean
  recommended: boolean
  /** 0–100, or null when the AI has not scored it */
  score: number | null
  /** Why the AI scored it so; shown when the row is open */
  reason?: string
  /** "3/5 tags" when only some tags of a skill are printed */
  tagCount?: string
}

interface Props {
  entity: EntityMeta
  state: RowState
  onToggle: () => void
  onExpand?: () => void
  /** Editor shown under the row when it is open */
  children?: React.ReactNode
}

/**
 * One library entry: include it or not, see the AI's opinion, open it to edit
 * what this resume prints. Included entries are white with a hard shadow.
 */
export function EntityRow({ entity, state, onToggle, onExpand, children }: Props) {
  const name = entityLabel(entity)
  const checkboxId = `include-${entity.id}`
  const editLabel = entity.type === 'skills' ? 'Choose tags' : 'Edit description'

  return (
    <li
      className={cn(
        'rounded-control border-2 border-ink transition-[background-color,box-shadow]',
        state.selected ? 'bg-surface shadow-hard' : 'bg-canvas',
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <input
          id={checkboxId}
          type="checkbox"
          checked={state.selected}
          onChange={onToggle}
          className="mt-0.5 size-5 cursor-pointer self-start accent-ink sm:self-center"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={checkboxId} className="cursor-pointer font-extrabold leading-tight">{name}</label>
          <p className="truncate text-xs text-ink-muted">{entitySubLabel(entity)}</p>
          {(state.recommended || state.score !== null || state.tagCount) && (
            <div className="flex flex-wrap items-center gap-2">
              {state.recommended && <Badge label="Recommended" variant="accent" />}
              {state.score !== null && <span className="text-xs font-semibold tabular-nums">{state.score}% match</span>}
              {state.tagCount && <Badge label={state.tagCount} variant="muted" />}
            </div>
          )}
        </div>
        {onExpand && (
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={state.expanded}
            onClick={onExpand}
            className="col-start-2 justify-self-start sm:col-start-3"
          >
            {editLabel}
            <ChevronDown size={14} aria-hidden="true" className={cn('transition-transform', state.expanded && 'rotate-180')} />
          </Button>
        )}
      </div>
      {state.expanded && (
        <div className="flex flex-col gap-3 border-t-2 border-ink p-3">
          {state.reason && (
            <p className="text-sm">
              <span className="font-semibold">Why it matches: </span>
              <span className="text-ink-muted">{state.reason}</span>
            </p>
          )}
          {children}
        </div>
      )}
    </li>
  )
}
