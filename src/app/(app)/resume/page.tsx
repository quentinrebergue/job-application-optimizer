import Link from 'next/link'
import { BookOpen, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { listEntities } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import { GeneratePdfButton } from '@/components/resume/GeneratePdfButton'
import { ResumeDefaultsEditor } from '@/components/resume/ResumeDefaultsEditor'
import { verifySession } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'
import { SentenceBankManager } from '@/components/cover-letter/SentenceBankManager'

export default async function ResumePage() {
  const { userId } = await verifySession()
  const entityLists = await Promise.all(ENTITY_TYPE_IDS.map((t) => listEntities(userId, t)))
  const [experiences, projects, skills] = entityLists
  const allEntities = [...(experiences ?? []), ...(projects ?? []), ...(skills ?? [])]

  const stats = [
    { label: 'Experiences', count: experiences?.length ?? 0, tab: 'experiences' },
    { label: 'Projects', count: projects?.length ?? 0, tab: 'projects' },
    { label: 'Skills', count: skills?.length ?? 0, tab: 'skills' },
  ]

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <PageHeader
        title="Resume Builder"
        subtitle="Manage your entity library and generate tailored PDF resumes."
      >
        <div className="flex gap-2">
          <Link
            href="/entities/new"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            New Entity
          </Link>
        </div>
      </PageHeader>

      {/* Default resume content */}
      <section className="mb-8">
        <ResumeDefaultsEditor />
      </section>

      {/* Entity Library Summary */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Entity Library</h2>
          <Link href="/entities" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <BookOpen size={14} />
            Browse all
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={`/entities?tab=${s.tab}`}
              className="rounded-xl border border-slate-200 bg-white p-5 text-center hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <p className="text-3xl font-bold text-slate-900">{s.count}</p>
              <Badge label={s.label} />
            </Link>
          ))}
        </div>
      </section>

      {/* Quick PDF Generation */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Quick Generate</h2>
        <p className="text-sm text-slate-500 mb-4">
          Generate a preview PDF using all entities in your library. For job-specific PDFs with AI
          ranking, use the <Link href="/jobs" className="text-blue-600 hover:underline">Job Tracker</Link>.
        </p>
        <GeneratePdfButton entityIds={allEntities.map((e) => e.id)} />
      </section>

      {/* Cover Letter Sentence Bank */}
      <section className="mb-8">
        <SentenceBankManager />
      </section>
    </div>
  )
}
