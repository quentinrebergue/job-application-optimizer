'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Alert } from '@/components/ui/Alert'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { FEATURES } from '@/config'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { fetchJson } from '@/lib/http'
import type { JobTab } from '@/lib/job-filter'
import type { ApplicationStatus, JobOffer } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { CoverLetterPanel } from './CoverLetterPanel'
import { JobOfferEditor } from './JobOfferEditor'
import type { SaveState } from './useJobAutosave'
import { ResumeConfigPanel } from './ResumeConfigPanel'
import { StatusSelect } from './StatusSelect'

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
  const [error, setError] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(initialJob.ai_analysis ?? null)
  // One save indicator for the offer and the resume, both saved automatically.
  const [offerSave, setOfferSave] = useState<SaveState>('idle')
  const [resumeSaving, setResumeSaving] = useState(false)
  const [savedSomething, setSavedSomething] = useState(false)
  const saving = offerSave === 'saving' || resumeSaving
  if (saving && !savedSomething) setSavedSomething(true)
  const saveLabel = saving ? 'Saving…' : savedSomething && offerSave !== 'error' ? 'All changes saved' : ''

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
    if (!confirm('Delete this job? This cannot be undone.')) return
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

  const coverLetterTab = { value: 'cover-letter' as const, label: 'Cover letter', disabled: !FEATURES.coverLetter, note: FEATURES.coverLetter ? undefined : 'Soon' }
  // Below desktop, the segments on top of the card switch between the panels.
  const tabs = (
    <SegmentedTabs
      label="Job sections"
      items={[{ value: 'offer', label: 'Offer' }, { value: 'resume', label: 'Resume' }, coverLetterTab]}
      value={tab}
      onChange={changeTab}
    />
  )
  // On desktop both columns show; below, only the selected tab.
  const shownBelowDesktop = (panel: JobTab) => cn(tab === panel ? 'block' : 'hidden', 'lg:block')

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 border-b-2 border-ink pb-6">
        <Link href="/jobs" className="self-start text-sm font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          ← All jobs
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight">{job.title}</h1>
            <p className="mt-1 text-ink-muted">
              <span className="font-semibold text-ink">{job.company}</span>
              {' · '}Added <span className="tabular-nums">{formatDate(job.date_added)}</span>
              {job.location && <> · {job.location}</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p aria-live="polite" className="text-sm text-ink-muted empty:hidden">{saveLabel}</p>
            {!FEATURES.coverLetter && (
              <span className="hidden rounded-control border-2 border-dashed border-ink px-2 py-1 text-xs font-semibold text-ink-muted lg:inline">
                Cover letter · Soon
              </span>
            )}
            <StatusSelect value={job.status} onChange={handleStatusChange} disabled={busy} />
          </div>
        </div>
        {error && <Alert>{error}</Alert>}
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        {/* On desktop the offer follows the scroll, at most one screen high: the resume is usually much longer. */}
        <PanelCard
          title="Offer"
          tabs={tabs}
          className={cn(shownBelowDesktop('offer'), 'lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto')}
        >
          <JobOfferEditor job={job} onSaved={setJob} onDelete={handleDelete} deleting={busy} onSaveStateChange={setOfferSave} />
        </PanelCard>

        <PanelCard title="Resume" tabs={tabs} className={shownBelowDesktop('resume')}>
          <ResumeConfigPanel
            jobId={id}
            aiAnalysis={aiAnalysis}
            onRankingComplete={(result) => { setAiAnalysis(result); setJob((prev) => ({ ...prev, ai_analysis: result })) }}
            onClearAi={handleClearAi}
            hasAiData={!!aiAnalysis}
            onSavingChange={setResumeSaving}
          />
        </PanelCard>

        {FEATURES.coverLetter && tab === 'cover-letter' && (
          <PanelCard title="Cover letter" tabs={tabs} className="lg:col-span-2">
            <CoverLetterPanel jobId={id} />
          </PanelCard>
        )}
      </div>
    </div>
  )
}

/**
 * A big card for one part of the page, in the light `panel` tint so the white
 * fields and cards inside stand out. Its top edge is the tab bar below
 * desktop, and a title strip on desktop where both cards are side by side.
 * No overflow-hidden on the resume card: it would stop the download button from floating.
 */
function PanelCard({ title, tabs, className, children }: { title: string; tabs: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className={cn('rounded-control border-2 border-ink bg-panel shadow-hard', className)}>
      <div className="lg:hidden">{tabs}</div>
      <h2 className="hidden border-b-2 border-ink px-5 py-3 text-xl font-extrabold tracking-tight lg:block">{title}</h2>
      <div className="p-4 md:p-6">{children}</div>
    </section>
  )
}
