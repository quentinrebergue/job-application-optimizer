import { PageHeader } from '@/components/ui/PageHeader'
import { listEntities } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import { ResumeDefaultsEditor } from '@/components/resume/ResumeDefaultsEditor'
import { LibraryPanel } from '@/components/entities/LibraryPanel'
import { ImportResume } from '@/components/entities/ImportResume'
import { parseLibraryTab } from '@/lib/entity-filter'
import { verifySession } from '@/lib/auth/dal'
import { page } from '@/components/ui/styles'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Resume' }

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="relative rounded-control border-2 border-ink bg-panel p-4 shadow-hard md:p-6">
      <h2 id={id} className="mb-4 text-xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

/** Your profile and your library: what every tailored resume is made of. */
export default async function ResumePage({ searchParams }: PageProps<'/resume'>) {
  const { userId } = await verifySession()
  const [lists, { tab }] = await Promise.all([
    Promise.all(ENTITY_TYPE_IDS.map((t) => listEntities(userId, t))),
    searchParams,
  ])

  return (
    <div className={page}>
      <PageHeader title="Resume">
        <ImportResume />
      </PageHeader>

      <div className="flex flex-col gap-8">
        <Section id="profile" title="Profile">
          <ResumeDefaultsEditor />
        </Section>

        <Section id="library" title="Library">
          <LibraryPanel entities={lists.flat()} initialTab={parseLibraryTab(tab)} />
        </Section>
      </div>
    </div>
  )
}
