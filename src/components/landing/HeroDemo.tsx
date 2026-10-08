'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { eyebrow, stroke } from '@/components/ui/styles'
import { DemoStage } from './demo/DemoStage'
import { CompactRankRow } from './demo/drawn'
import { useDemo } from './demo/useDemo'
import { ResumeExample } from './ResumeExample'

type Screen = 'offer' | 'rank' | 'resume'

const TITLE = 'Backend engineer · Northwind'
const DESCRIPTION =
  'We are looking for a backend engineer to design and run our route-planning APIs in Go and PostgreSQL. You will ship features end to end, improve performance and join the on-call rotation.'
/** What the AI picks from the library, one entry per section, as the job page shows it (see ResumeExample for the resume it gives). */
const RESULTS = [
  { group: 'Work', name: 'Backend engineer', recommended: true, match: 92 },
  { group: 'Projects', name: 'Booking service in Go', recommended: true, match: 88 },
  { group: 'Education', name: 'MSc Computer Science', recommended: false, match: 76 },
]
const STEPS = ['Import', 'Rank', 'Download'] as const
const ACTIVE_STEP: Record<Screen, number> = { offer: 0, rank: 1, resume: 2 }

const field = cn(stroke, 'bg-surface px-3 py-2 text-sm')
const chip = cn(stroke, 'px-3 py-1.5 text-xs font-semibold')

/**
 * The three clicks, played on a made-up job: a cursor adds an offer, ranks it
 * with the AI and downloads the resume, then starts again. The only looping
 * thing on the site: it has a pause button and, with prefers-reduced-motion,
 * it is just the finished resume (see docs/design/identity.md).
 */
export function HeroDemo() {
  const [screen, setScreen] = useState<Screen>('offer')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [rows, setRows] = useState(0)
  const [ranking, setRanking] = useState(false)

  const [stage, demo] = useDemo(
    async ({ wait, moveTo, press, type, hideCursor }) => {
      setScreen('offer'); setTitle(''); setDescription(''); setRows(0); setRanking(false)
      await wait(600)
      await moveTo('title')
      await type(TITLE, setTitle, 1)
      await moveTo('description')
      await type(DESCRIPTION, setDescription, 3)
      await wait(400)
      await moveTo('add')
      await press('add')
      setScreen('rank')
      await wait(500)
      await moveTo('rank')
      await press('rank')
      setRanking(true)
      await wait(900)
      setRanking(false)
      for (let i = 1; i <= RESULTS.length; i++) {
        setRows(i)
        await wait(450)
      }
      await wait(900)
      await moveTo('download')
      await press('download')
      await wait(300)
      setScreen('resume')
      hideCursor()
      await wait(5000)
    },
    { loop: true, whenVisible: false },
  )

  const shown: Screen = demo.reduced ? 'resume' : screen

  return (
    <DemoStage
      stageRef={stage}
      demo={demo}
      label="Demo with made-up data: a job offer is added, ranked with AI, and a tailored resume is downloaded."
      caption="Example with made-up data."
      heightClass="h-[30rem]"
      widthClass="max-w-md md:max-w-[22rem] lg:max-w-md"
      header={
        <ol className="flex border-b-2 border-ink text-xs font-extrabold uppercase tracking-wider">
          {STEPS.map((name, index) => (
            <li key={name} className={cn('flex-1 whitespace-nowrap px-1.5 py-2.5 text-center text-[11px] sm:text-xs', index > 0 && 'border-l-2 border-ink', ACTIVE_STEP[shown] === index ? 'bg-accent' : 'bg-surface text-ink-muted')}>
              {index + 1} · {name}
            </li>
          ))}
        </ol>
      }
    >
      {shown === 'offer' && (
        <div className="flex flex-col gap-3">
          <p className={eyebrow}>New job</p>
          <div data-target="title" className={field}>{title || <span className="text-ink-muted">Title and company</span>}</div>
          <div data-target="description" className={cn(field, 'h-32 overflow-hidden leading-snug')}>{description || <span className="text-ink-muted">Description</span>}</div>
          <span data-target="add" className={cn(chip, 'self-start bg-accent', demo.lift('add'))}>Add job</span>
        </div>
      )}

      {shown === 'rank' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-extrabold leading-tight sm:text-base">{TITLE}</p>
            <span data-target="rank" className={cn(chip, 'shrink-0 bg-ai', demo.lift('rank'))}>{ranking ? 'Ranking…' : 'Rank with AI'}</span>
          </div>
          <div className="flex min-h-[11.5rem] flex-col gap-2">
            {RESULTS.slice(0, rows).map((row) => (
              <CompactRankRow key={row.group} name={row.name} group={row.group} recommended={row.recommended} match={row.match} />
            ))}
          </div>
          <span data-target="download" className={cn(chip, 'self-start bg-accent', demo.lift('download'), rows < RESULTS.length && 'invisible')}>Download PDF</span>
        </div>
      )}

      {shown === 'resume' && <ResumeExample showCaption={false} className="max-w-none" paperClassName="p-4 text-[10px] shadow-none sm:p-4 sm:text-[11px]" />}
    </DemoStage>
  )
}
