// Entity Type Registry — adding a new entity type means adding ONE entry here.
// All list views, forms, routing, and data functions derive from this config.

import { EntityType } from '@/types'

export interface EntityTypeConfig {
  id: EntityType
  label: string
  labelSingular: string
  /** lucide-react icon name (string, resolved at render time) */
  icon: string
  color: string
}

export const ENTITY_TYPE_CONFIGS: EntityTypeConfig[] = [
  {
    id: 'experiences',
    label: 'Experiences',
    labelSingular: 'Experience',
    icon: 'Briefcase',
    color: 'blue',
  },
  {
    id: 'projects',
    label: 'Projects',
    labelSingular: 'Project',
    icon: 'FolderOpen',
    color: 'purple',
  },
  {
    id: 'skills',
    label: 'Skills',
    labelSingular: 'Skill',
    icon: 'Zap',
    color: 'emerald',
  },
  {
    id: 'education',
    label: 'Education',
    labelSingular: 'Education',
    icon: 'GraduationCap',
    color: 'orange',
  },
]

export const ENTITY_TYPE_IDS: EntityType[] = ENTITY_TYPE_CONFIGS.map((c) => c.id)

export function getEntityTypeConfig(id: EntityType): EntityTypeConfig {
  const config = ENTITY_TYPE_CONFIGS.find((c) => c.id === id)
  if (!config) throw new Error(`Unknown entity type: ${id}`)
  return config
}
