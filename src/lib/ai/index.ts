import type { EntityMeta } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { askGateway, type GatewayAnswer } from './gateway'
import { ANSWER_LAYOUT, parseYamlAnswer, type PromptOptions } from './formats'
import { buildRankingPrompt, buildRankingSchema, normalizeRanking, type RankingDiagnostics } from './ranking-prompt'

type Library = {
  experiences: EntityMeta[]
  projects: EntityMeta[]
  skills: EntityMeta[]
  education?: EntityMeta[]
}

/** Rates the user's library against a job offer, through the AI gateway; the tokens and the model are returned to be counted (#203). */
export async function rankJobWithAI(
  userId: string,
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  entities: Library,
): Promise<{ analysis: AIAnalysisResult; usage: GatewayAnswer['usage']; model?: string }> {
  const { analysis, usage, model } = await rankWithUsage(userId, jobTitle, jobCompany, jobDescription, entities)
  return { analysis, usage, model }
}

/** Same, with the tokens the call used, what the AI got wrong, its answer as it came and the size of each part of the prompt (the evaluation script measures all of them). */
export async function rankWithUsage(
  userId: string,
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  entities: Library,
  options: PromptOptions = {},
): Promise<{ analysis: AIAnalysisResult; usage: GatewayAnswer['usage']; model?: string; diagnostics: RankingDiagnostics; raw: unknown; promptParts: Record<string, number> }> {
  const { prompt, labels, parts } = buildRankingPrompt(jobTitle, jobCompany, jobDescription, entities, options)
  const answerFormat = options.answerFormat ?? 'json'
  const system = ANSWER_LAYOUT[answerFormat].system
  // JSON: the schema holds the model to the labels and levels of this library. YAML (an experiment, picked by
  // the evaluation only) cannot be held to a schema: the gateway returns the text and the code validates it.
  const { content, usage, model } = answerFormat === 'json'
    ? await askGateway({ feature: 'rank', userId, system, prompt, ...(options.schema === false ? {} : { schema: buildRankingSchema(labels) }) })
    : await askGateway({ feature: 'rank', userId, system, prompt, format: 'text' })
  const data = answerFormat === 'json' ? content : parseYamlAnswer(String(content))
  const { analysis, diagnostics } = normalizeRanking(data, labels)
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
    model,
    diagnostics,
    raw: data,
    promptParts: Object.fromEntries(Object.entries(parts).map(([name, text]) => [name, text.length])),
  }
}
