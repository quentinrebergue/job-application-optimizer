// Q&A trainer types — flashcard test session for resume questions

export interface GeneralQuestion {
  id: string
  question: string
  answer: string
  tags: string[]
}

export type CardState = 'question' | 'answer'

/** all       → all entity Q&A + all general flashcards
 *  job       → job-scoped entities + job Q&A + taxonomy-matched flashcards
 *  topics    → general flashcards filtered by selected tags (no entity Q&A)
 *  job+topics → job entities + job Q&A + flashcards for selected tags
 */
export type TestScope = 'all' | 'job' | 'topics' | 'job+topics'

export interface TestConfig {
  questionCount: number
  scope: TestScope
  jobId?: string   // required when scope is 'job' or 'job+topics'
  tags?: string[]  // required when scope is 'topics' or 'job+topics'
}

export interface TestCard {
  id: string
  question: string
  answer: string
  /** Source of the question for display purposes */
  source: string
}

export interface TestSession {
  config: TestConfig
  /** All cards selected for this session */
  total: TestCard[]
  /** Cards still needing a correct answer */
  queue: TestCard[]
  /** Number of cards answered correctly (drives progress bar) */
  correctCount: number
}
