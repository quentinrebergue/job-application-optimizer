// Module Registry — sidebar navigation and dashboard cards are generated from this.
// Adding a new module means adding ONE entry here.

export interface ModuleConfig {
  id: string
  label: string
  /** Short label used in the mobile bottom tab bar */
  shortLabel: string
  href: string
  /** lucide-react icon name */
  icon: string
  description: string
  color: string
}

export const MODULE_CONFIGS: ModuleConfig[] = [
  {
    id: 'resume',
    label: 'Resume Builder',
    shortLabel: 'Resume',
    href: '/resume',
    icon: 'FileText',
    description: 'Manage your resume entities and generate tailored PDFs',
    color: 'blue',
  },
  {
    id: 'jobs',
    label: 'Job Tracker',
    shortLabel: 'Jobs',
    href: '/jobs',
    icon: 'Briefcase',
    description: 'Track job applications and manage your pipeline',
    color: 'purple',
  },
  {
    id: 'qa',
    label: 'Q&A Trainer',
    shortLabel: 'Q&A',
    href: '/qa',
    icon: 'MessageSquare',
    description: 'Train on interview questions about your resume',
    color: 'emerald',
  },
  {
    id: 'coding',
    label: 'Coding Trainer',
    shortLabel: 'Coding',
    href: '/coding',
    icon: 'Code2',
    description: 'Practice coding exercises with pattern recognition',
    color: 'orange',
  },
  {
    id: 'taxonomy',
    label: 'Tag Taxonomy',
    shortLabel: 'Tags',
    href: '/taxonomy',
    icon: 'Network',
    description: 'Manage the tag hierarchy used for ranking and Q&A',
    color: 'slate',
  },
]
