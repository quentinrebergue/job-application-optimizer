'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { cardClasses } from '@/components/ui/Card'
import { eyebrow } from '@/components/ui/styles'
import { DemoStage } from './demo/DemoStage'
import { DrawnField, DrawnTabs, drawnButton } from './demo/drawn'
import { useDemo } from './demo/useDemo'

type Tab = 'experiences' | 'projects' | 'education'

const TABS = [
  { id: 'experiences', label: 'Experiences' },
  { id: 'projects', label: 'Projects' },
  { id: 'education', label: 'Education' },
]
const EXPERIENCE = { title: 'Backend engineer', company: 'Atelier Pixel', period: '2021 – now', description: 'Built the booking API used by 40 studios.' }

function EntryCard({ title, subtitle, chips }: { title: string; subtitle: string; chips?: string[] }) {
  return (
    <div className={cardClasses({ className: 'flex flex-col gap-1' })}>
      <span className="font-extrabold leading-tight">{title}</span>
      <p className="truncate text-sm text-ink-muted">{subtitle}</p>
      {chips && <div className="flex flex-wrap gap-1.5 pt-1">{chips.map((chip) => <Badge key={chip} label={chip} variant="muted" />)}</div>}
    </div>
  )
}

/**
 * Step one of "How it works": fill the library. A cursor adds an experience
 * with the form of the app, then shows a project and a degree. Plays once, when
 * the stage scrolls into view.
 */
export function LibraryDemo() {
  const [tab, setTab] = useState<Tab>('experiences')
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [period, setPeriod] = useState('')
  const [description, setDescription] = useState('')
  const [saved, setSaved] = useState(false)
  const [project, setProject] = useState(false)
  const [degree, setDegree] = useState(false)

  const [stage, demo] = useDemo(
    async ({ wait, moveTo, press, type }) => {
      setTab('experiences'); setFormOpen(false); setTitle(''); setCompany(''); setPeriod(''); setDescription('')
      setSaved(false); setProject(false); setDegree(false)
      await wait(500)
      await moveTo('add')
      await press('add')
      setFormOpen(true)
      await wait(300)
      await moveTo('title')
      await type(EXPERIENCE.title, setTitle, 2)
      await moveTo('company')
      await type(EXPERIENCE.company, setCompany, 2)
      await moveTo('period')
      await type(EXPERIENCE.period, setPeriod, 2)
      await moveTo('description')
      await type(EXPERIENCE.description, setDescription, 3)
      await moveTo('save')
      await press('save')
      setFormOpen(false)
      setSaved(true)
      await wait(700)
      await moveTo('tab-projects')
      await press('tab-projects')
      setTab('projects')
      await wait(300)
      setProject(true)
      await wait(900)
      await moveTo('tab-education')
      await press('tab-education')
      setTab('education')
      await wait(300)
      setDegree(true)
      await wait(600)
    },
    { loop: false, whenVisible: true },
  )

  // With prefers-reduced-motion: the finished picture.
  const shown = demo.reduced ? { tab: 'experiences' as Tab, form: false, saved: true, project: true, degree: true } : { tab, form: formOpen, saved, project, degree }

  return (
    <DemoStage
      stageRef={stage}
      demo={demo}
      label="Demo with made-up data: an experience is added to the library with the form, then a project and a degree."
      caption="Example with made-up data."
      heightClass="h-[25rem]"
      widthClass="max-w-sm"
      header={<DrawnTabs items={TABS} current={shown.tab} />}
    >
      {shown.tab === 'experiences' && !shown.form && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className={eyebrow}>Experiences</p>
            <span data-target="add" className={cn(drawnButton, 'bg-accent', demo.lift('add'))}>Add an experience</span>
          </div>
          {shown.saved ? <EntryCard title={EXPERIENCE.title} subtitle={`${EXPERIENCE.company} · ${EXPERIENCE.period}`} /> : <p className="text-sm text-ink-muted">Nothing here yet.</p>}
        </div>
      )}
      {shown.tab === 'experiences' && shown.form && (
        <div className="flex flex-col gap-2">
          <DrawnField label="Title" value={title} placeholder="Title" target="title" />
          <DrawnField label="Company" value={company} placeholder="Company" target="company" />
          <DrawnField label="Period" value={period} placeholder="Period" target="period" />
          <DrawnField label="Description" value={description} placeholder="Description" target="description" tall />
          <span data-target="save" className={cn(drawnButton, 'self-start bg-accent', demo.lift('save'))}>Save</span>
        </div>
      )}
      {shown.tab === 'projects' && (
        <div className="flex flex-col gap-3">
          <p className={eyebrow}>Projects</p>
          {shown.project ? <EntryCard title="Booking service in Go" subtitle="Used by 40 studios" chips={['Go', 'PostgreSQL']} /> : <p className="text-sm text-ink-muted">Nothing here yet.</p>}
        </div>
      )}
      {shown.tab === 'education' && (
        <div className="flex flex-col gap-3">
          <p className={eyebrow}>Education</p>
          {shown.degree ? <EntryCard title="MSc Computer Science" subtitle="Université de Lyon · 2018" /> : <p className="text-sm text-ink-muted">Nothing here yet.</p>}
        </div>
      )}
    </DemoStage>
  )
}
