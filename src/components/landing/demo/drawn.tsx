import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { stroke, stickerText } from '@/components/ui/styles'

/** A form field drawn as in the app: a small label over a white box. `target` is where the demo cursor goes. */
export function DrawnField({ label, value, placeholder, target, tall }: { label: string; value: string; placeholder: string; target: string; tall?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption font-semibold">{label}</span>
      <div data-target={target} className={cn(stroke, 'bg-surface px-control py-2 text-small', tall ? 'h-12 overflow-hidden leading-snug' : 'truncate')}>
        {value || <span className="text-ink-muted">{placeholder}</span>}
      </div>
    </div>
  )
}

/** A drawn button: the main action is red; `lift` comes from the demo (it moves while the cursor presses it). */
export const drawnButton = cn(stroke, 'px-control py-1.5 text-caption font-semibold')

/** The strip of tabs or steps above a demo: the current one in red. */
export function DrawnTabs({ items, current }: { items: { id: string; label: string }[]; current: string }) {
  return (
    <ol className={cn(stickerText, 'flex border-b-2 border-ink')}>
      {items.map((item, index) => (
        <li key={item.id} data-target={`tab-${item.id}`} className={cn('flex-1 px-control py-2.5 text-center', index > 0 && 'border-l-2 border-ink', current === item.id ? 'bg-accent' : 'bg-surface text-ink-muted')}>
          {item.label}
        </li>
      ))}
    </ol>
  )
}

/** One library entry as the job page shows it after the AI ranked it: checkbox, name, Recommended tag, match. */
export function RankRow({ name, recommended, match }: { name: string; recommended: boolean; match: number }) {
  return (
    <div className={cn(stroke, 'flex items-start gap-inline bg-surface p-row shadow-hard')}>
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[3px] border-2 border-ink bg-ink text-canvas">
        <Check size={14} strokeWidth={3} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-small font-extrabold leading-tight">{name}</p>
        <div className="flex flex-wrap items-center gap-2">
          {recommended && <Badge label="Recommended" variant="accent" />}
          <span className="text-caption font-semibold tabular-nums">{match}% match</span>
        </div>
      </div>
    </div>
  )
}

/** The same entry on two lines instead of three: the tag beside the name, the section and the match under it. */
export function CompactRankRow({ name, group, recommended, match }: { name: string; group: string; recommended: boolean; match: number }) {
  return (
    <div className={cn(stroke, 'flex items-start gap-inline bg-surface p-2.5 shadow-hard')}>
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[3px] border-2 border-ink bg-ink text-canvas">
        <Check size={14} strokeWidth={3} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-small font-extrabold leading-tight">{name}</p>
          {recommended && <Badge label="Recommended" variant="accent" className="shrink-0" />}
        </div>
        <p className="text-caption text-ink-muted">{group} · <span className="font-semibold tabular-nums text-ink">{match}% match</span></p>
      </div>
    </div>
  )
}
