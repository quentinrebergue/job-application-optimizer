'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { JobForm } from '@/components/jobs/JobForm'
import { StatusBadge } from '@/components/jobs/JobCard'
import { ResumeConfigPanel } from '@/components/jobs/ResumeConfigPanel'
import { CoverLetterPanel } from '@/components/jobs/CoverLetterPanel'
import { QuestionEditor } from '@/components/entities/QuestionEditor'
import type { ApplicationStatus, JobOffer, EntityQuestion } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '@/config'

const STATUS_PIPELINE: ApplicationStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected']

interface Props {
  initialJob: JobOffer
  initialQuestions: EntityQuestion[]
}

export function JobDetailClient({ initialJob, initialQuestions }: Props) {
  const router = useRouter()
  const id = initialJob.id

  const [job, setJob] = useState<JobOffer>(initialJob)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(initialJob.ai_analysis ?? null)
  const [questions, setQuestions] = useState<EntityQuestion[]>(initialQuestions)
  const [savingQ, setSavingQ] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [coverLetterOpen, setCoverLetterOpen] = useState(false)
  const [qaOpen, setQaOpen] = useState(false)

  async function handleSaveQuestions(updated: EntityQuestion[]) {
    setQuestions(updated)
    setSavingQ(true)
    await fetch(`/api/jobs/${id}/questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    setSavingQ(false)
  }

  async function handleSaveMeta(data: Omit<JobOffer, 'id' | 'date_added'>) {
    setSaving(true)
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      setJob(await res.json())
      setEditing(false)
    }
  }

  async function handleStatusChange(status: ApplicationStatus) {
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setJob(await res.json())
  }

  async function handleDelete() {
    if (!confirm('Delete this job? This cannot be undone.')) return
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    router.push('/jobs')
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft size={14} /> Job Tracker
      </Link>

      <PageHeader title={`${job.company} — ${job.title}`}>
        <StatusBadge status={job.status} />
        <button onClick={() => setEditing((v) => !v)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          {editing ? 'Cancel' : 'Edit'}
        </button>
        <button onClick={handleDelete} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1">
          <Trash2 size={14} /> Delete
        </button>
      </PageHeader>

      <section className="mb-8">
        {editing ? (
          <JobForm initial={job} saving={saving} onSave={handleSaveMeta} onCancel={() => setEditing(false)} />
        ) : (
          <JobMetaView job={job} onStatusChange={handleStatusChange} />
        )}
      </section>

      {/* Resume Config */}
      <section className="mb-8">
        <button onClick={() => setResumeOpen((v) => !v)} className="w-full flex items-center justify-between text-left group">
          <h2 className="text-lg font-semibold text-slate-900">Resume for this Job</h2>
          <span className="text-slate-400 group-hover:text-slate-600 transition-colors text-base font-bold">{resumeOpen ? '−' : '+'}</span>
        </button>
        {resumeOpen && (
          <div className="mt-4">
            {aiAnalysis && (
              <div className="mb-6 border border-slate-200 rounded-lg">
                {/* AIRankResults removed for now — add back if needed */}
              </div>
            )}
            <ResumeConfigPanel
              jobId={id}
              aiAnalysis={aiAnalysis}
              onRankingComplete={(result) => { setAiAnalysis(result); setJob((prev) => ({ ...prev, ai_analysis: result })) }}
              onClearAi={async () => {
                await fetch(`/api/jobs/${id}/rank`, { method: 'DELETE' })
                setAiAnalysis(null)
                setJob((prev) => ({ ...prev, ai_analysis: undefined, ats_tags: [] }))
              }}
              hasAiData={!!aiAnalysis}
            />
          </div>
        )}
      </section>

      {/* Cover Letter */}
      <section className="mb-8">
        <button onClick={() => setCoverLetterOpen((v) => !v)} className="w-full flex items-center justify-between text-left group">
          <h2 className="text-lg font-semibold text-slate-900">Cover Letter</h2>
          <span className="text-slate-400 group-hover:text-slate-600 transition-colors text-base font-bold">{coverLetterOpen ? '−' : '+'}</span>
        </button>
        {coverLetterOpen && <div className="mt-4"><CoverLetterPanel jobId={id} /></div>}
      </section>

      {/* Q&A */}
      <section>
        <button onClick={() => setQaOpen((v) => !v)} className="w-full flex items-center justify-between text-left group">
          <h2 className="text-lg font-semibold text-slate-900">
            Interview Q&amp;A <span className="text-sm font-normal text-slate-400">({questions.length})</span>
          </h2>
          <span className="text-slate-400 group-hover:text-slate-600 transition-colors text-base font-bold">{qaOpen ? '−' : '+'}</span>
        </button>
        {qaOpen && (
          <div className="mt-4">
            <p className="text-sm text-slate-500 mb-4">Questions specific to this job — they appear in the Q&amp;A trainer alongside your general flashcards.</p>
            <QuestionEditor questions={questions} onChange={handleSaveQuestions} saving={savingQ} />
          </div>
        )}
      </section>
    </div>
  )
}

function JobMetaView({ job, onStatusChange }: { job: JobOffer; onStatusChange: (s: ApplicationStatus) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-2">Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_PIPELINE.map((s) => (
            <button key={s} onClick={() => onStatusChange(s)} className={['rounded-full px-4 py-1 text-xs font-semibold border transition-colors', job.status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'].join(' ')}>
              {APPLICATION_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
      <dl className="space-y-3">
        <MetaRow label="Added" value={new Date(job.date_added).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
        {job.location && <MetaRow label="Location" value={job.location} />}
        {job.url && (
          <div className="grid grid-cols-3 gap-2">
            <dt className="text-sm font-medium text-slate-500">URL</dt>
            <dd className="col-span-2">
              <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                {job.url} <ExternalLink size={12} />
              </a>
            </dd>
          </div>
        )}
        {job.description && (
          <div>
            <dt className="text-sm font-medium text-slate-500 mb-1">Description</dt>
            <dd className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">{job.description}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="col-span-2 text-sm text-slate-900">{value}</dd>
    </div>
  )
}
