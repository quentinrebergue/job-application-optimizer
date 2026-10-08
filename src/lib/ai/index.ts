import type { EntityMeta } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { askGateway } from './gateway'
import { buildRankingPrompt, normalizeRanking, RANKING_SYSTEM_PROMPT } from './ranking-prompt'

/** Scores the user's library against a job offer, through the AI gateway. */
export async function rankJobWithAI(
  userId: string,
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
  const prompt = buildRankingPrompt(jobTitle, jobCompany, jobDescription, entities, aiContext)
  const { content } = await askGateway({ feature: 'rank', userId, system: RANKING_SYSTEM_PROMPT, prompt })
  return {
    job_id: '', // Will be set by the caller
    analyzed_at: new Date().toISOString(),
    ...normalizeRanking(content),
  }
}
