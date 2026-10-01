import Link from 'next/link'
import { BookOpen, Plus, Settings } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { getTemplate, getAllSectionTemplates, getAllEntityTemplates } from '@/lib/latex'
import { listEntities } from '@/lib/data'
import { ENTITY_TYPE_IDS, ENTITY_SECTION_TYPES, ENTITY_TEMPLATE_FIELDS, type EntitySectionType } from '@/config'
import { GeneratePdfButton } from '@/components/resume/GeneratePdfButton'
import { SectionTemplateEditor } from '@/components/resume/SectionTemplateEditor'
import { ResumeDefaultsEditor } from '@/components/resume/ResumeDefaultsEditor'
import { verifySession } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'
import { SentenceBankManager } from '@/components/cover-letter/SentenceBankManager'

export default async function ResumePage() {
  const { userId } = await verifySession()
  const [template, sectionTemplates, entityTemplates, ...entityLists] = await Promise.all([
    getTemplate().catch(() => null),
    getAllSectionTemplates().catch(() => ({} as Record<EntitySectionType, string>)),
    getAllEntityTemplates().catch(() => ({} as Record<EntitySectionType, string>)),
    ...ENTITY_TYPE_IDS.map((t) => listEntities(userId, t)),
  ])
  const [experiences, projects, skills] = entityLists as Awaited<ReturnType<typeof listEntities>>[]
  const allEntities = [...(experiences ?? []), ...(projects ?? []), ...(skills ?? [])]

  const stats = [
    { label: 'Experiences', count: experiences?.length ?? 0, color: 'blue' as const, tab: 'experiences' },
    { label: 'Projects', count: projects?.length ?? 0, color: 'purple' as const, tab: 'projects' },
    { label: 'Skills', count: skills?.length ?? 0, color: 'green' as const, tab: 'skills' },
  ]

  const sectionLabels: Record<EntitySectionType, string> = {
    experiences: 'Work Experience',
    projects: 'School Projects',
    skills: 'Technical Expertise',
    education: 'Education',
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <PageHeader
        title="Resume Builder"
        subtitle="Manage your entity library and generate tailored LaTeX PDFs."
      >
        <div className="flex gap-2">
          <Link
            href="/resume/templates"
            className="flex items-center gap-1.5 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            <Settings size={16} />
            Edit Templates
          </Link>
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
              <Badge label={s.label} variant={s.color} />
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

      {/* Per-section LaTeX templates */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Section Templates</h2>
        <p className="text-sm text-slate-500 mb-4">
          Each section type has its own LaTeX wrapper. Edit these to customise how your entities appear in the PDF.
          Use <code className="font-mono text-xs bg-slate-100 px-1 rounded">%%ITEMS%%</code> where the entity snippets are injected.
        </p>
        <div className="space-y-4">
          {ENTITY_SECTION_TYPES.map((type) => (
            <SectionTemplateEditor
              key={type}
              type={type}
              label={sectionLabels[type]}
              sectionContent={sectionTemplates[type] ?? ''}
              entityContent={entityTemplates[type] ?? ''}
              entityFields={ENTITY_TEMPLATE_FIELDS[type]}
            />
          ))}
        </div>
      </section>

      {/* Main LaTeX template viewer */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Full LaTeX Template</h2>
        <p className="text-sm text-slate-500 mb-3">
          The main document scaffold. Section blocks are injected via <code className="font-mono text-xs bg-slate-100 px-1 rounded">%%EXPERIENCES_SECTION%%</code> etc.
        </p>
        {template ? (
          <pre className="rounded-xl border border-slate-200 bg-slate-900 text-slate-100 text-xs font-mono p-5 overflow-x-auto max-h-96 whitespace-pre">
            {template}
          </pre>
        ) : (
          <p className="text-sm text-red-500">
            Template not found at <code className="font-mono">data/resume/template.tex</code>.
          </p>
        )}
      </section>
    </div>
  )
}
