import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { stroke } from '@/components/ui/styles'
import type { Demo } from './useDemo'

interface DemoStageProps {
  stageRef: React.RefObject<HTMLDivElement | null>
  demo: Demo
  /** What the demo shows, for screen readers (the drawing itself is hidden from them) */
  label: string
  caption: string
  /** Height of the stage (a class) */
  heightClass: string
  /** Maximum width (a class); the default is the hero's */
  widthClass?: string
  /** Optional strip above the content (tabs, steps) */
  header?: React.ReactNode
  children: React.ReactNode
}

/** The frame of a demo: a sticker with the drawing, the cursor on top, a caption and the pause or replay button. */
export function DemoStage({ stageRef, demo, label, caption, heightClass, widthClass = 'max-w-md', header, children }: DemoStageProps) {
  const control = demo.done ? { text: 'Replay demo', action: demo.replay, pressed: undefined } : { text: demo.playing ? 'Pause demo' : 'Play demo', action: demo.toggle, pressed: !demo.playing }
  return (
    <div className={cn('mx-auto w-full', widthClass)}>
      <div ref={stageRef} role="img" aria-label={label} className={cn(stroke, 'relative isolate overflow-hidden bg-panel shadow-hard', heightClass)}>
        {header}
        <div className={cn('absolute inset-x-0 bottom-0 p-4', header ? 'top-10' : 'top-0')}>{children}</div>
        <svg
          aria-hidden="true"
          viewBox="0 0 22 22"
          className={cn('pointer-events-none absolute left-0 top-0 z-10 size-6 transition-[translate,opacity] duration-700 ease-in-out motion-reduce:hidden', demo.cursor.visible ? 'opacity-100' : 'opacity-0')}
          style={{ translate: `${demo.cursor.x}px ${demo.cursor.y}px` }}
        >
          <path d="M3 2l15 8-6.5 2L9 19z" className="fill-surface stroke-ink" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="mt-3 flex items-start justify-between gap-4">
        <p className="text-sm text-ink-muted">{caption}</p>
        {!demo.reduced && (
          <Button variant="secondary" aria-pressed={control.pressed} onClick={control.action}>{control.text}</Button>
        )}
      </div>
    </div>
  )
}
