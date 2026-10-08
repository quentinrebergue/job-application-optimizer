import type { EntityMeta } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { askGateway, type GatewayAnswer } from './gateway'
import { buildRankingPrompt, normalizeRanking, RANKING_SYSTEM_PROMPT } from './ranking-prompt'

type Library = {
  experiences: EntityMeta[]
  projects: EntityMeta[]
  skills: EntityMeta[]
  education: EntityMeta[]
}

/** Scores the user's library against a job offer, through the AI gateway. */
export async function rankJobWithAI(
  userId: string,
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  entities: Library,
  aiContext?: string,
): Promise<AIAnalysisResult> {
  return (await rankWithUsage(userId, jobTitle, jobCompany, jobDescription, entities, aiContext)).analysis
}

/** Same, with the tokens the call used (the evaluation script measures them). */
export async function rankWithUsage(
  userId: string,
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  entities: Library,
  aiContext?: string,
): Promise<{ analysis: AIAnalysisResult; usage: GatewayAnswer['usage'] }> {
  const prompt = buildRankingPrompt(jobTitle, jobCompany, jobDescription, entities, aiContext)
  const { content, usage } = await askGateway({ feature: 'rank', userId, system: RANKING_SYSTEM_PROMPT, prompt })
  return {
    analysis: {
      job_id: '', // Will be set by the caller
      analyzed_at: new Date().toISOString(),
      ...normalizeRanking(content),
    },
    usage,
  }
}
