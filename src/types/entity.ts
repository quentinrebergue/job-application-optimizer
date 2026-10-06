// Entity types — represent user's resume content (experiences, projects, skills, education)

export type EntityType = 'experiences' | 'projects' | 'skills' | 'education'

export interface ExperienceMeta {
  id: string
  type: 'experiences'
  title: string
  company: string
  location?: string
  period: string
  description: string
  tags: string[]
  latex_snippet?: string
}

export interface ProjectMeta {
  id: string
  type: 'projects'
  title: string
  tech: string[]
  description: string
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
