'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

export interface Direction {
  id: 'flat' | 'tempered' | 'full'
  name: string
  summary: string
}

const NAV = ['Jobs', 'Resume']

const TABS = [
  { value: 'all', label: 'All', count: 39 },
  { value: 'saved', label: 'Saved', count: 8 },
  { value: 'applied', label: 'Applied', count: 17 },
]

const JOBS = [
  { title: 'Software Engineer (Backend)', company: 'Helsing', date: '24 Sept 2026', status: 'saved' },
  { title: 'Junior Software Engineer', company: 'Canonical', date: '24 Sept 2026', status: 'applied' },
  { title: 'Linux Devices Engineer', company: 'Canonical', date: '24 Sept 2026', status: 'interview' },
]

const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected']

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs uppercase tracking-wider text-[color:var(--nb-muted)]">{children}</p>
}

/** One direction: every element reads the variables of its `theme-*` wrapper (themes.css). */
export function DirectionPreview({ direction }: { direction: Direction }) {
  const [tab, setTab] = useState('all')

  return (
    <section
      aria-labelledby={`direction-${direction.id}`}
      className={`theme-${direction.id} nb-panel flex min-w-0 flex-col gap-6 rounded-control border border-line p-5`}
    >
      <header className="flex flex-col gap-1">
        <h2 id={`direction-${direction.id}`} className="nb-heading text-lg">{direction.name}</h2>
        <p className="text-sm text-[color:var(--nb-muted)]">{direction.summary}</p>
      </header>

      <div className="flex flex-col gap-2">
        <Label>Navigation</Label>
        <nav aria-label={`${direction.name} navigation sample`} className="nb-nav max-w-48">
          {NAV.map((item, i) => (
            <a key={item} href="#" className="nb-nav-item" aria-current={i === 0 ? 'page' : undefined}>
              {item}
            </a>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Buttons</Label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="nb-button nb-button-primary">
            <Plus size={16} aria-hidden="true" /> Add Job
          </button>
          <button type="button" className="nb-button nb-button-secondary">Download PDF</button>
          <button type="button" className="nb-button nb-button-ghost">Cancel</button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Status badges</Label>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <span key={status} className="nb-badge capitalize" data-status={status}>{status}</span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`job-url-${direction.id}`} className="font-mono text-xs uppercase tracking-wider text-[color:var(--nb-muted)]">
          Field
        </label>
        <input id={`job-url-${direction.id}`} className="nb-input" placeholder="Paste a LinkedIn job URL" />
      </div>

      <div className="flex flex-col gap-3">
        <Label>Jobs list sample</Label>
        <div role="group" aria-label="Filter by status" className="nb-tabs">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={tab === t.value}
              onClick={() => setTab(t.value)}
              className="nb-tab"
            >
              {t.label} <span className="font-mono text-xs">{t.count}</span>
            </button>
          ))}
        </div>
        {JOBS.map((job) => (
          <a key={job.title} href="#" className="nb-card nb-card-interactive">
            <span className="flex items-start justify-between gap-2">
              <span className="nb-heading leading-tight">{job.title}</span>
              <span className="nb-badge capitalize" data-status={job.status}>{job.status}</span>
            </span>
            <span className="mt-1 block text-sm text-[color:var(--nb-muted)]">{job.company}</span>
            <span className="mt-3 block font-mono text-xs text-[color:var(--nb-muted)]">{job.date}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
