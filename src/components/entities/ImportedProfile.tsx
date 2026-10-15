'use client'

import { ProfileView } from '@/components/resume/ProfileView'
import { SectionTitle, panelCard } from './ImportedParts'

/** The profile as the import left it, in the import result: the same view as the Resume page, with what the resume said apart. */
export function ImportedProfile({ found }: { found: Record<string, string> }) {
  return (
    <section aria-label="Profile" className="flex flex-col gap-heading">
      <SectionTitle>Profile</SectionTitle>
      <div className={panelCard}>
        <ProfileView found={found} header={(toggle) => <div className="flex justify-end">{toggle}</div>} />
      </div>
    </section>
  )
}
