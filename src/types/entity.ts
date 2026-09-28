// Entity types — represent user's resume content (experiences, projects, skills, education)

export type EntityType = 'experiences' | 'projects' | 'skills' | 'education'

export interface EntityQuestion {
  id: string
  question: string
  answer: string
}

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

export interface Experience extends ExperienceMeta {
  questions: EntityQuestion[]
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

export interface Project extends ProjectMeta {
  questions: EntityQuestion[]
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

export interface Skill extends SkillMeta {
  questions: EntityQuestion[]
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

export interface Education extends EducationMeta {
  questions: EntityQuestion[]
}

export type EntityMeta = ExperienceMeta | ProjectMeta | SkillMeta | EducationMeta
export type Entity = Experience | Project | Skill | Education
