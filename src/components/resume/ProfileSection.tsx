'use client'

import { ImportResume } from '@/components/entities/ImportResume'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { panelSection } from '@/components/ui/styles'
import { ProfileView } from './ProfileView'

/** The Profile section of the Resume page: its title with the Import and Edit buttons on the same line, and the profile as text. */
export function ProfileSection() {
  return (
    <section aria-labelledby="profile" className={panelSection}>
      <ProfileView
        header={(toggle, editing) => (
          <div className="flex items-center justify-between gap-inline">
            <SectionTitle id="profile" level="page">Profile</SectionTitle>
            <div className="flex items-center gap-inline">
              {/* Not while the profile is being edited: Done comes first, and the import would write into it. */}
              {!editing && <ImportResume size="sm" />}
              {toggle}
            </div>
          </div>
        )}
      />
    </section>
  )
}
