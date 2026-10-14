import { PageHeader } from '@/components/ui/PageHeader'
import { listEntities } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import { ResumeDefaultsEditor } from '@/components/resume/ResumeDefaultsEditor'
import { LibraryPanel } from '@/components/entities/LibraryPanel'
import { ImportResume } from '@/components/entities/ImportResume'
import { verifySession } from '@/lib/auth/dal'
import { page } from '@/components/ui/styles'
import { SectionTitle } from '@/components/ui/SectionTitle'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Resume' }

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="relative rounded-control border-2 border-ink bg-panel p-panel shadow-hard">
      <SectionTitle id={id} level="page" className="mb-heading">{title}</SectionTitle>
      {children}
    </section>
  )
}

/** Your profile and your library: what every tailored resume is made of. */
export default async function ResumePage() {
  const { userId } = await verifySession()
  const lists = await Promise.all(ENTITY_TYPE_IDS.map((t) => listEntities(userId, t)))

  return (
    <div className={page}>
      <PageHeader title="Resume">
        <ImportResume />
      </PageHeader>

      <div className="flex flex-col gap-section">
        <Section id="profile" title="Profile">
          <ResumeDefaultsEditor />
        </Section>

        <Section id="library" title="Library">
          <LibraryPanel entities={lists.flat()} />
        </Section>
      </div>
    </div>
  )
}
