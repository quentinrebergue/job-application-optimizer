import type { EntityMeta } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { askGateway, type GatewayAnswer } from './gateway'
import { buildRankingPrompt, buildRankingSchema, normalizeRanking, RANKING_SYSTEM_PROMPT, type RankingDiagnostics } from './ranking-prompt'

type Library = {
  experiences: EntityMeta[]
  projects: EntityMeta[]
  skills: EntityMeta[]
  education?: EntityMeta[]
}

/** Rates the user's library against a job offer, through the AI gateway. */
export async function rankJobWithAI(
  userId: string,
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  entities: Library,
): Promise<AIAnalysisResult> {
  return (await rankWithUsage(userId, jobTitle, jobCompany, jobDescription, entities)).analysis
}

/** Same, with the tokens the call used and what the AI got wrong (the evaluation script measures both). */
export async function rankWithUsage(
  userId: string,
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  entities: Library,
): Promise<{ analysis: AIAnalysisResult; usage: GatewayAnswer['usage']; diagnostics: RankingDiagnostics }> {
  const { prompt, labels } = buildRankingPrompt(jobTitle, jobCompany, jobDescription, entities)
  const { content, usage } = await askGateway({
    feature: 'rank',
    userId,
    system: RANKING_SYSTEM_PROMPT,
    prompt,
    schema: buildRankingSchema(labels),
  })
  const { analysis, diagnostics } = normalizeRanking(content, labels)
  if (diagnostics.invalidIds > 0 || diagnostics.unrated > 0) {
    console.warn(`AI ranking: ${diagnostics.invalidIds} invalid label(s) dropped, ${diagnostics.unrated} entry(ies) not rated`)
  }
  return {
    analysis: {
      job_id: '', // Will be set by the caller
      analyzed_at: new Date().toISOString(),
      ...analysis,
    },
    usage,
    diagnostics,
  }
}
