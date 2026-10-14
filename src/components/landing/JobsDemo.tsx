'use client'

import { useState } from 'react'
import { APPLICATION_STATUS_BADGES, APPLICATION_STATUS_LABELS } from '@/config'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { cardClasses } from '@/components/ui/Card'
import { eyebrow } from '@/components/ui/styles'
import { DemoStage } from './demo/DemoStage'
import { DrawnField, drawnButton } from './demo/drawn'
import { useDemo } from './demo/useDemo'

const JOB = { title: 'Backend engineer', company: 'Northwind Logistics', description: 'Design and run our APIs in Go and PostgreSQL.' }
const OTHERS = [
  { title: 'Data engineer', company: 'Lumen Analytics', status: 'applied' },
  { title: 'Platform engineer', company: 'Orbit', status: 'interview' },
]

function JobCard({ title, company, status, target }: { title: string; company: string; status: string; target?: string }) {
  return (
    <div className={cardClasses({ className: 'flex flex-col gap-1' })}>
      <div className="flex items-start justify-between gap-inline">
        <span className="font-extrabold leading-tight">{title}</span>
        <span data-target={target}>
          <Badge label={APPLICATION_STATUS_LABELS[status]} variant={APPLICATION_STATUS_BADGES[status]} className="w-20 justify-center" />
        </span>
      </div>
      <p className="truncate text-small text-ink-muted">{company}</p>
    </div>
  )
}

/**
 * Step two of "How it works": add an offer to the list, then follow it
 * (saved, applied, interview, offer). Plays once, when the stage scrolls into view.
 */
export function JobsDemo() {
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')
  const [added, setAdded] = useState(false)
  const [status, setStatus] = useState('saved')

  const [stage, demo] = useDemo(
    async ({ wait, moveTo, press, type }) => {
      setFormOpen(false); setTitle(''); setCompany(''); setDescription(''); setAdded(false); setStatus('saved')
      await wait(500)
      await moveTo('add')
      await press('add')
      setFormOpen(true)
      await wait(300)
      await moveTo('title')
      await type(JOB.title, setTitle, 2)
      await moveTo('company')
      await type(JOB.company, setCompany, 2)
      await moveTo('description')
      await type(JOB.description, setDescription, 3)
      await moveTo('submit')
      await press('submit')
      setFormOpen(false)
      setAdded(true)
      await wait(900)
      await moveTo('status')
      await press('status')
      setStatus('applied')
      await wait(450)
      // The cursor is already on the badge: the next clicks follow quickly.
      await press('status')
      setStatus('interview')
      await wait(450)
      await press('status')
      setStatus('offer')
      await wait(800)
    },
    { loop: false, whenVisible: true },
  )

  // With prefers-reduced-motion: the finished picture.
  const shown = demo.reduced ? { form: false, added: true, status: 'offer' } : { form: formOpen, added, status }

  return (
    <DemoStage
      stageRef={stage}
      demo={demo}
      label="Demo with made-up data: a job offer is added to the list, then its status goes from saved to applied, interview and offer."
      caption="Example with made-up data."
      heightClass="h-[23rem]"
      widthClass="max-w-sm"
    >
      {!shown.form ? (
        <div className="flex flex-col gap-inline">
          <div className="flex items-center justify-between gap-inline">
            <p className={eyebrow}>Jobs</p>
            <span data-target="add" className={cn(drawnButton, 'bg-accent', demo.lift('add'))}>Add a job</span>
          </div>
          {shown.added && <JobCard title={JOB.title} company={JOB.company} status={shown.status} target="status" />}
          {OTHERS.map((job) => <JobCard key={job.title} {...job} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <DrawnField label="Title" value={title} placeholder="Title" target="title" />
          <DrawnField label="Company" value={company} placeholder="Company" target="company" />
          <DrawnField label="Description" value={description} placeholder="Description" target="description" tall />
          <span data-target="submit" className={cn(drawnButton, 'self-start bg-accent', demo.lift('submit'))}>Add job</span>
        </div>
      )}
    </DemoStage>
  )
}
