export type CoverLetterCategory =
  | 'opening'
  | 'motivation'
  | 'experience'
  | 'skills'
  | 'closing'
  | 'custom'

export const COVER_LETTER_CATEGORIES: CoverLetterCategory[] = [
  'opening',
  'motivation',
  'experience',
  'skills',
  'closing',
  'custom',
]

export const COVER_LETTER_CATEGORY_LABELS: Record<CoverLetterCategory, string> = {
  opening: 'Opening',
  motivation: 'Motivation',
  experience: 'Experience',
  skills: 'Skills',
  closing: 'Closing',
  custom: 'Custom',
}

export const COVER_LETTER_CATEGORY_COLORS: Record<CoverLetterCategory, string> = {
  opening: 'bg-blue-50 text-blue-700 border-blue-200',
  motivation: 'bg-purple-50 text-purple-700 border-purple-200',
  experience: 'bg-amber-50 text-amber-700 border-amber-200',
  skills: 'bg-green-50 text-green-700 border-green-200',
  closing: 'bg-slate-50 text-slate-700 border-slate-200',
  custom: 'bg-rose-50 text-rose-700 border-rose-200',
}

export interface CoverLetterSentence {
  id: string
  text: string
  category: CoverLetterCategory
  tags: string[]
  created_at: string
}

export interface JobCoverLetterConfig {
  selected_sentence_ids: string[]
  generated_letter: string
  ai_context: string
}
