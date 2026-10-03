'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Alert } from '@/components/ui/Alert'
import { Tabs } from '@/components/ui/Tabs'
import { FEATURES } from '@/config'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { fetchJson } from '@/lib/http'
import type { JobTab } from '@/lib/job-filter'
import type { ApplicationStatus, JobOffer } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { CoverLetterPanel } from './CoverLetterPanel'
import { JobOfferEditor } from './JobOfferEditor'
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
          <div className="flex items-center gap-3">
            {!FEATURES.coverLetter && (
              <span className="hidden rounded-control border-2 border-dashed border-ink px-2 py-1 text-xs font-semibold text-ink-muted lg:inline">
                Cover letter · Soon
              </span>
            )}
            <StatusSelect value={job.status} onChange={handleStatusChange} disabled={busy} />
          </div>
        </div>
        {error && <Alert>{error}</Alert>}
        <Tabs
          label="Job sections"
          className="lg:hidden"
          items={[{ value: 'offer', label: 'Offer' }, { value: 'resume', label: 'Resume' }, coverLetterTab]}
          value={tab}
          onChange={changeTab}
        />
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <section aria-label="Offer" className={shownBelowDesktop('offer')}>
          <JobOfferEditor job={job} onSaved={setJob} onDelete={handleDelete} deleting={busy} />
        </section>

        <section aria-label="Resume" className={shownBelowDesktop('resume')}>
          <ResumeConfigPanel
            jobId={id}
            aiAnalysis={aiAnalysis}
            onRankingComplete={(result) => { setAiAnalysis(result); setJob((prev) => ({ ...prev, ai_analysis: result })) }}
            onClearAi={handleClearAi}
            hasAiData={!!aiAnalysis}
          />
        </section>

        {FEATURES.coverLetter && tab === 'cover-letter' && (
          <section aria-label="Cover letter" className="lg:col-span-2">
            <CoverLetterPanel jobId={id} />
          </section>
        )}
      </div>
    </div>
  )
}
