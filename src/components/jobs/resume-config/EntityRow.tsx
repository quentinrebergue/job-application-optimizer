'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
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
  reason?: string
  /** "3/5 tags" when only some tags of a skill are printed */
  tagCount?: string
  /** Position controls for experiences and projects */
  canMoveUp?: boolean
  canMoveDown?: boolean
}

interface Props {
  entity: EntityMeta
  state: RowState
  onToggle: () => void
  onExpand?: () => void
  onMove?: (direction: 'up' | 'down') => void
  /** Editor shown under the row when expanded */
  children?: React.ReactNode
}

/** One library entry: include it or not, see the AI's opinion, reorder it, edit it for this job. */
export function EntityRow({ entity, state, onToggle, onExpand, onMove, children }: Props) {
  const name = entityLabel(entity)
  const checkboxId = `include-${entity.id}`
  const isSkill = entity.type === 'skills'

  return (
    <li
      className={cn(
        'rounded-control border-2 border-ink transition-[background-color,box-shadow]',
        state.selected ? 'bg-surface shadow-hard' : 'bg-canvas',
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={state.selected}
          onChange={onToggle}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={checkboxId} className="cursor-pointer font-semibold leading-tight">{name}</label>
            {state.recommended && <Badge label="Recommended" variant="accent" />}
            {state.tagCount && <Badge label={state.tagCount} variant="muted" />}
          </div>
          <p className="truncate text-xs text-ink-muted">{entitySubLabel(entity)}</p>
          {state.score !== null && (
            <p className="mt-1 text-xs">
              <span className="font-semibold tabular-nums">{state.score}% match</span>
              {state.reason && <span className="text-ink-muted"> — {state.reason}</span>}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          {onMove && (
            <>
              <IconButton aria-label={`Move ${name} up`} onClick={() => onMove('up')} disabled={!state.canMoveUp}>↑</IconButton>
              <IconButton aria-label={`Move ${name} down`} onClick={() => onMove('down')} disabled={!state.canMoveDown}>↓</IconButton>
            </>
          )}
          {onExpand && (
            <IconButton
              aria-label={isSkill ? `Choose the tags of ${name}` : `Edit the description of ${name}`}
              aria-expanded={state.expanded}
              onClick={onExpand}
            >
              {state.expanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
            </IconButton>
          )}
        </div>
      </div>
      {state.expanded && children && <div className="border-t-2 border-ink p-3">{children}</div>}
    </li>
  )
}
