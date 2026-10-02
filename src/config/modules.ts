// Module Registry — sidebar navigation and dashboard cards are generated from this.
// Labels are short because the app header shows them as is.
// Adding a new module means adding ONE entry here.
// Q&A, Coding and Tags are switched off for now to focus on Jobs and Resume (#79).

export interface ModuleConfig {
  id: string
  label: string
  href: string
  /** Other URL prefixes that belong to this module (marked active in the navigation) */
  alsoActiveOn?: string[]
  /** lucide-react icon name */
  icon: string
  description: string
  color: string
  /** Off: hidden from the navigation and the dashboard, its pages return 404 (API untouched) */
  enabled: boolean
}

export const MODULE_CONFIGS: ModuleConfig[] = [
  {
    id: 'jobs',
    label: 'Jobs',
    href: '/jobs',
    icon: 'Briefcase',
    description: 'Track job applications and manage your pipeline',
    color: 'purple',
    enabled: true,
  },
  {
    id: 'resume',
    label: 'Resume',
    href: '/resume',
    alsoActiveOn: ['/entities'],
    icon: 'FileText',
    description: 'Manage your resume entities and generate tailored PDFs',
    color: 'blue',
    enabled: true,
  },
  {
    id: 'qa',
    label: 'Q&A',
    href: '/qa',
    icon: 'MessageSquare',
    description: 'Train on interview questions about your resume',
    color: 'emerald',
    enabled: false,
  },
  {
    id: 'coding',
    label: 'Coding',
    href: '/coding',
    icon: 'Code2',
    description: 'Practice coding exercises with pattern recognition',
    color: 'orange',
    enabled: false,
  },
  {
    id: 'taxonomy',
    label: 'Tags',
    href: '/taxonomy',
    icon: 'Network',
    description: 'Manage the tag hierarchy used for ranking and Q&A',
    color: 'slate',
    enabled: false,
  },
]

/** Modules shown in the navigation and on the dashboard. */
export const ENABLED_MODULES: ModuleConfig[] = MODULE_CONFIGS.filter((mod) => mod.enabled)

export function isModuleEnabled(id: string): boolean {
  return ENABLED_MODULES.some((mod) => mod.id === id)
}
