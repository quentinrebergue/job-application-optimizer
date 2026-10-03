'use client'

import { ChevronDown } from 'lucide-react'
import type { EntityMeta } from '@/types'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
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
  const editLabel = entity.type === 'skills' ? 'Choose the tags' : 'Edit the description'

  return (
    <li
      className={cn(
        'rounded-control border-2 border-ink transition-[background-color,box-shadow]',
        state.selected ? 'bg-surface shadow-hard' : 'bg-canvas',
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 p-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={state.selected}
          onChange={onToggle}
          className="mt-0.5 size-5 cursor-pointer accent-ink"
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
          <IconButton
            aria-label={`${editLabel} of ${name}`}
            aria-expanded={state.expanded}
            onClick={onExpand}
            className="size-9 border-ink bg-surface hover:bg-canvas"
          >
            <ChevronDown size={18} aria-hidden="true" className={cn('transition-transform', state.expanded && 'rotate-180')} />
          </IconButton>
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
