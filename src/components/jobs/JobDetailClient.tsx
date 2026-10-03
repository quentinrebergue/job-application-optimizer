'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Disclosure } from '@/components/ui/Disclosure'
import { JobForm } from '@/components/jobs/JobForm'
import { JobMeta } from '@/components/jobs/JobMeta'
import { StatusBadge } from '@/components/jobs/JobCard'
import { ResumeConfigPanel } from '@/components/jobs/ResumeConfigPanel'
import { CoverLetterPanel } from '@/components/jobs/CoverLetterPanel'
import { QuestionEditor } from '@/components/entities/QuestionEditor'
import { fetchJson } from '@/lib/http'
import type { ApplicationStatus, JobOffer, EntityQuestion } from '@/types'
import type { AIAnalysisResult } from '@/types/job'

interface Props {
  initialJob: JobOffer
  initialQuestions: EntityQuestion[]
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.'
}

export function JobDetailClient({ initialJob, initialQuestions }: Props) {
  const router = useRouter()
  const id = initialJob.id

  const [job, setJob] = useState<JobOffer>(initialJob)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(initialJob.ai_analysis ?? null)
  const [questions, setQuestions] = useState<EntityQuestion[]>(initialQuestions)
  const [savingQ, setSavingQ] = useState(false)

  // Failures are shown above the page and leave the screen as it was (#77).

  async function handleSaveQuestions(updated: EntityQuestion[]) {
    const previous = questions
    setQuestions(updated)
    setSavingQ(true)
    setError(null)
    try {
      await fetchJson(`/api/jobs/${id}/questions`, { method: 'PUT', json: updated })
    } catch (err) {
      setQuestions(previous)
      setError(`Questions not saved: ${message(err)}`)
    } finally {
      setSavingQ(false)
    }
  }

  // JobForm shows the error itself, so this one rethrows.
  async function handleSaveMeta(data: Omit<JobOffer, 'id' | 'date_added'>) {
    setSaving(true)
    try {
      setJob(await fetchJson<JobOffer>(`/api/jobs/${id}`, { method: 'PUT', json: data }))
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(status: ApplicationStatus) {
    if (status === job.status) return
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

  return (
    <div className="flex max-w-4xl flex-col gap-8 p-4 md:p-8">
      <div>
        <Link href="/jobs" className="mb-4 inline-block text-sm font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          ← All jobs
        </Link>
        <PageHeader title={job.title} subtitle={job.company}>
          <StatusBadge status={job.status} />
          <Button variant="secondary" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Cancel edit' : 'Edit'}
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={busy}>Delete</Button>
        </PageHeader>
        {error && <Alert className="-mt-4 mb-2">{error}</Alert>}

        {editing ? (
          <JobForm initial={job} saving={saving} onSave={handleSaveMeta} onCancel={() => setEditing(false)} />
        ) : (
          <JobMeta job={job} onStatusChange={handleStatusChange} statusDisabled={busy} />
        )}
      </div>

      {/* The core of the app: open by default (QA-11). */}
      <Disclosure title="Resume for this job" defaultOpen>
        <ResumeConfigPanel
          jobId={id}
          aiAnalysis={aiAnalysis}
          onRankingComplete={(result) => { setAiAnalysis(result); setJob((prev) => ({ ...prev, ai_analysis: result })) }}
          onClearAi={handleClearAi}
          hasAiData={!!aiAnalysis}
        />
      </Disclosure>

      <Disclosure title="Cover letter">
        <CoverLetterPanel jobId={id} />
      </Disclosure>

      <Disclosure title="Interview Q&A" meta={String(questions.length)}>
        <p className="mb-4 text-sm text-ink-muted">Questions specific to this job.</p>
        <QuestionEditor questions={questions} onChange={handleSaveQuestions} saving={savingQ} />
      </Disclosure>
    </div>
  )
}
