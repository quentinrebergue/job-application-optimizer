import { PageHeader } from '@/components/ui/PageHeader'
import { listEntities } from '@/lib/data'
import { ENTITY_TYPE_IDS } from '@/config'
import { ProfileSection } from '@/components/resume/ProfileSection'
import { LibraryPanel } from '@/components/entities/LibraryPanel'
import { verifySession } from '@/lib/auth/dal'
import { page } from '@/components/ui/styles'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Resume' }

/** Your profile and your library: what every tailored resume is made of. */
export default async function ResumePage() {
  const { userId } = await verifySession()
  const lists = await Promise.all(ENTITY_TYPE_IDS.map((t) => listEntities(userId, t)))

  return (
    <div className={page}>
      <PageHeader title="Resume" hideOnPhone />

      <div className="flex flex-col gap-section">
        <ProfileSection />

        <LibraryPanel entities={lists.flat()} />
      </div>
    </div>
  )
}
