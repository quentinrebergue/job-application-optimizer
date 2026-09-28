import type { EntityMeta } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { rankJobWithGemini } from './gemini'
import { rankJobWithClaude } from './claude'

export { rankEntities } from './ranker'

export type AIProvider = 'gemini' | 'claude'

export const AI_PROVIDERS: AIProvider[] = ['gemini', 'claude']

export function isAIProvider(value: unknown): value is AIProvider {
  return value === 'gemini' || value === 'claude'
}

/** Dispatches the job-ranking call to whichever provider the caller picked. */
export async function rankJobWithAI(
  provider: AIProvider,
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  entities: {
    experiences: EntityMeta[]
    projects: EntityMeta[]
    skills: EntityMeta[]
    education: EntityMeta[]
  },
  aiContext?: string,
): Promise<AIAnalysisResult> {
  const rank = provider === 'claude' ? rankJobWithClaude : rankJobWithGemini
  return rank(jobTitle, jobCompany, jobDescription, entities, aiContext)
}
