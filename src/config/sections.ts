// The app's sections, in the order of the top bar.

export interface SectionConfig {
  id: string
  label: string
  href: string
  /** Other URL prefixes that belong to this section (marked active in the navigation) */
  alsoActiveOn?: string[]
}

export const SECTIONS: SectionConfig[] = [
  { id: 'jobs', label: 'Jobs', href: '/jobs' },
  { id: 'resume', label: 'Resume', href: '/resume', alsoActiveOn: ['/entities'] },
]
