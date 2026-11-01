// Entity types — represent user's resume content (experiences, projects, skills, education)

export type EntityType = 'experiences' | 'projects' | 'skills' | 'education'

/** Another version of a description (#297): a name the user chose ("Short", "Technical") and its text. The main description stays in `description`. */
export interface DescriptionVariant {
  name: string
  text: string
}

export interface ExperienceMeta {
  id: string
  type: 'experiences'
  title: string
  company: string
  location?: string
  period: string
  description: string
  /** Other versions of the description, picked per job. Absent = none. */
  descriptions?: DescriptionVariant[]
  tags: string[]
  latex_snippet?: string
}

export interface ProjectMeta {
  id: string
  type: 'projects'
  title: string
  tech: string[]
  /** Where the project lives (its repository, a demo): the title links to it on the resume. Absent or empty = no link. */
  url?: string
  description: string
  descriptions?: DescriptionVariant[]
  tags: string[]
  latex_snippet?: string
}

export interface SkillMeta {
  id: string
  type: 'skills'
  name: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  tags: string[]
  latex_snippet?: string
}

export interface EducationMeta {
  id: string
  type: 'education'
  degree: string
  institution: string
  period: string
  tags: string[]
  latex_snippet?: string
}

export type EntityMeta = ExperienceMeta | ProjectMeta | SkillMeta | EducationMeta
