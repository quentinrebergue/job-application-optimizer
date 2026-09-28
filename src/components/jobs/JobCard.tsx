'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import type { JobOffer } from '@/types'
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from '@/config'

export function StatusBadge({ status }: { status: string }) {
  const label = APPLICATION_STATUS_LABELS[status] ?? status
  const color = APPLICATION_STATUS_COLORS[status] ?? APPLICATION_STATUS_COLORS['saved']
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

export function JobCard({ job }: { job: JobOffer }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-400 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
          {job.title}
        </span>
        <StatusBadge status={job.status} />
      </div>
      <p className="text-sm text-slate-500 mb-1">{job.company}</p>
      {job.location && <p className="text-xs text-slate-400 mb-2">{job.location}</p>}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-slate-400">
          {new Date(job.date_added).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        {job.url && (
          <ExternalLink size={13} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
        )}
      </div>
    </Link>
  )
}
