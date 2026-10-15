'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Alert } from '@/components/ui/Alert'
import { ConfirmDrawer } from '@/components/ui/ConfirmDrawer'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { fetchJson } from '@/lib/http'
import type { JobTab } from '@/lib/job-filter'
import type { ApplicationStatus, JobOffer } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { JobOfferEditor } from './JobOfferEditor'
import type { SaveState } from './useJobAutosave'
import { ResumeConfigPanel } from './ResumeConfigPanel'
import { StatusSelect } from './StatusSelect'
import { page } from '@/components/ui/styles'

interface Props {
  initialJob: JobOffer
  initialTab: JobTab
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.'
}

/**
 * Job page. Phone and tablet: a header, then tabs (Offer, Resume, Cover letter).
 * Desktop: the offer and the resume side by side; the tabs are not needed.
 */
export function JobDetailClient({ initialJob, initialTab }: Props) {
  const router = useRouter()
  const id = initialJob.id

  const [job, setJob] = useState<JobOffer>(initialJob)
  const [tab, setTab] = useState<JobTab>(initialTab)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(initialJob.ai_analysis ?? null)
  // One "Saving…" indicator for the offer and the resume, both saved automatically.
  const [offerSave, setOfferSave] = useState<SaveState>('idle')
  const [resumeSaving, setResumeSaving] = useState(false)
  const saving = offerSave === 'saving' || resumeSaving

  function changeTab(next: JobTab) {
    setTab(next)
    router.replace(next === 'offer' ? `/jobs/${id}` : `/jobs/${id}?tab=${next}`, { scroll: false })
  }

  async function handleStatusChange(status: ApplicationStatus) {
    setBusy(true)
    setError(null)
    try {
      setJob(await fetchJson<JobOffer>(`/api/jobs/${id}`, { method: 'PUT', json: { status } }))
    } catch (err) {
      setError(`Status not changed: ${message(err)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setError(null)
    try {
      await fetchJson(`/api/jobs/${id}`, { method: 'DELETE' })
      router.push('/jobs')
    } catch (err) {
      setError(`Job not deleted: ${message(err)}`)
      setBusy(false)
    }
  }

  async function handleClearAi() {
    try {
      await fetchJson(`/api/jobs/${id}/rank`, { method: 'DELETE' })
      setAiAnalysis(null)
      setJob((prev) => ({ ...prev, ai_analysis: undefined, ats_tags: [] }))
    } catch (err) {
      setError(`AI analysis not cleared: ${message(err)}`)
    }
  }

  // Announced, not built yet: shown greyed out so users know it is coming.
  const coverLetterTab = { value: 'cover-letter' as const, label: 'Cover letter', disabled: true, note: 'Soon' }
  // Below desktop, the segments on top of the card switch between the panels.
  const tabs = (
    <SegmentedTabs
      label="Job sections"
      items={[{ value: 'offer', label: 'Offer' }, { value: 'resume', label: 'Resume' }, coverLetterTab]}
      value={tab}
      onChange={changeTab}
    />
  )
  // On desktop both columns show; below, only the selected tab. The offer card is a
  // flex column on desktop (pinned title, scrolling body), so it asks for lg:flex.
  const shownBelowDesktop = (panel: JobTab, desktop: 'lg:block' | 'lg:flex' = 'lg:block') =>
    cn(tab === panel ? 'block' : 'hidden', desktop)

  return (
    <div className={cn(page, 'flex flex-col gap-section')}>
      {/* Back link and status on one row, then the title and its details. */}
      <header className="flex flex-col gap-heading lg:border-b-2 lg:border-ink lg:pb-section">
        <div className="flex items-center justify-between gap-inline">
          <Link href="/jobs" className="text-small-strong text-ink-muted underline-offset-4 hover:text-ink hover:underline">
            ← All jobs
          </Link>
          <div className="flex items-center gap-inline">
            {/* Only while saving: a permanent "saved" message is noise. Failures show an alert. */}
            <p aria-live="polite" className="text-small text-ink-muted">{saving ? 'Saving…' : ''}</p>
            <StatusSelect value={job.status} onChange={handleStatusChange} disabled={busy} />
          </div>
        </div>
        <div className="min-w-0">
          {/* On a phone: the title on one line and the date; the company and the place are in the Offer tab. */}
          <h1 className="text-title truncate sm:overflow-visible sm:whitespace-normal">{job.title}</h1>
          <p className="mt-1 hidden font-semibold sm:block">{job.company}</p>
          <p className="text-small text-ink-muted">
            Added <span className="tabular-nums">{formatDate(job.date_added)}</span>
            {job.location && <span className="hidden sm:inline"> · {job.location}</span>}
          </p>
        </div>
        {error && <Alert>{error}</Alert>}
      </header>

      <div className="grid grid-cols-1 gap-section lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        {/* On desktop the offer follows the scroll, at most one screen high: the resume is usually much longer. */}
        <PanelCard
          title="Offer"
          tabs={tabs}
          scrollBody
          className={cn(shownBelowDesktop('offer', 'lg:flex'), 'lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)]')}
        >
          <JobOfferEditor job={job} onSaved={setJob} onDelete={() => setConfirmDelete(true)} deleting={busy} onSaveStateChange={setOfferSave} />
        </PanelCard>

        <PanelCard
          title="Resume"
          tabs={tabs}
          desktopHeader={
            <SegmentedTabs
              label="Resume sections"
              items={[{ value: 'resume', label: 'Resume' }, coverLetterTab]}
              value="resume"
              onChange={changeTab}
            />
          }
          className={shownBelowDesktop('resume')}
        >
          <ResumeConfigPanel
            jobId={id}
            aiAnalysis={aiAnalysis}
            onRankingComplete={(result) => { setAiAnalysis(result); setJob((prev) => ({ ...prev, ai_analysis: result })) }}
            onClearAi={handleClearAi}
            hasAiData={!!aiAnalysis}
            onSavingChange={setResumeSaving}
          />
        </PanelCard>
      </div>

      <ConfirmDrawer
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this job?"
        description="The offer, its resume settings and its AI ranking are deleted. This cannot be undone."
        confirmLabel="Delete job"
        onConfirm={handleDelete}
      />
    </div>
  )
}

/**
 * A big card for one part of the page, in the light `panel` tint so the white
 * fields and cards inside stand out. Its top edge is the tab bar below desktop,
 * and a title strip on desktop where both cards are side by side.
 * `scrollBody`: on desktop the title stays put and only the body scrolls (the
 * card itself is limited in height by its className).
 * No overflow on the resume card: it would stop the download button from floating.
 */
function PanelCard({ title, tabs, desktopHeader, scrollBody, className, children }: {
  title: string
  tabs: React.ReactNode
  /** Replaces the title strip on desktop (e.g. Resume | Cover letter · Soon) */
  desktopHeader?: React.ReactNode
  scrollBody?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={title} className={cn(
        // Below desktop the card gives way to the page: edge to edge, tabs on top, the tint directly on the page (a phone is narrow), down to the footer, whose own stroke closes it.
        'border-ink bg-panel max-lg:-mx-gutter max-lg:-mb-gutter max-lg:border-t-2 lg:rounded-control lg:border-2 lg:shadow-hard',
        scrollBody && 'lg:flex-col',
        className,
      )}>
      <div className="lg:hidden">{tabs}</div>
      {desktopHeader ? (
        <div className="hidden shrink-0 lg:block">{desktopHeader}</div>
      ) : (
        <h2 className="text-section hidden shrink-0 border-b-2 border-ink px-panel py-bar lg:block">{title}</h2>
      )}
      {/* The gutter is reserved so the width (and the auto-grown text) does not jump when a scrollbar appears. */}
      <div className={cn('p-panel', scrollBody && 'lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:[scrollbar-gutter:stable]')}>{children}</div>
    </section>
  )
}
