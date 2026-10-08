'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { eyebrow } from '@/components/ui/styles'
import { DemoStage } from './demo/DemoStage'
import { RankRow, drawnButton } from './demo/drawn'
import { useDemo } from './demo/useDemo'
import { ResumeExample } from './ResumeExample'

const RESULTS = [
  { name: 'Backend engineer', recommended: true, match: 92 },
  { name: 'Booking service in Go', recommended: true, match: 88 },
  { name: 'MSc Computer Science', recommended: false, match: 76 },
]

/**
 * Step three of "How it works": the AI ranks the library for the job, the
 * resume is downloaded. Plays once, when the stage scrolls into view.
 */
export function ResumeDemo() {
  const [screen, setScreen] = useState<'rank' | 'resume'>('rank')
  const [ranking, setRanking] = useState(false)
  const [rows, setRows] = useState(0)

  const [stage, demo] = useDemo(
    async ({ wait, moveTo, press, hideCursor }) => {
      setScreen('rank'); setRanking(false); setRows(0)
      await wait(500)
      await moveTo('rank')
      await press('rank')
      setRanking(true)
      await wait(800)
      setRanking(false)
      for (let i = 1; i <= RESULTS.length; i++) {
        setRows(i)
        await wait(400)
      }
      await wait(700)
      await moveTo('download')
      await press('download')
      setScreen('resume')
      hideCursor()
      await wait(800)
    },
    { loop: false, whenVisible: true },
  )

  // With prefers-reduced-motion: the finished picture.
  const shown = demo.reduced ? 'resume' : screen

  return (
    <DemoStage
      stageRef={stage}
      demo={demo}
      label="Demo with made-up data: the AI ranks the library for a job, then the tailored resume is downloaded."
      caption="Example with made-up data."
      heightClass="h-[27rem]"
      widthClass="max-w-sm"
    >
      {shown === 'rank' ? (
        <div className="flex flex-col gap-3">
          <p className={eyebrow}>Resume for Backend engineer</p>
          <span data-target="rank" className={cn(drawnButton, 'self-start bg-ai', demo.lift('rank'))}>{ranking ? 'Ranking…' : 'Rank with AI'}</span>
          <div className="flex min-h-[13.5rem] flex-col gap-2">
            {RESULTS.slice(0, rows).map((row) => <RankRow key={row.name} {...row} />)}
          </div>
          <span data-target="download" className={cn(drawnButton, 'self-start bg-accent', demo.lift('download'), rows < RESULTS.length && 'invisible')}>Download PDF</span>
        </div>
      ) : (
        <ResumeExample showCaption={false} className="max-w-none" paperClassName="p-4 text-[10px] shadow-none sm:p-4 sm:text-[11px]" />
      )}
    </DemoStage>
  )
}
