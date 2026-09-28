import Anthropic from '@anthropic-ai/sdk'
import type { EntityMeta } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { buildRankingPrompt, parseRankingResponse } from './ranking-prompt'

// Sonnet 5 instead of Opus 5 — ~2.5x cheaper per token, still strong for
// structured extraction/scoring tasks like this one.
const CLAUDE_MODEL = 'claude-sonnet-5'

export async function rankJobWithClaude(
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
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable not set')
  }

  const prompt = buildRankingPrompt(jobTitle, jobCompany, jobDescription, entities, aiContext)

  console.log('\n' + '═'.repeat(80))
  console.log('CLAUDE PROMPT')
  console.log('═'.repeat(80))
  console.log(prompt)
  console.log('═'.repeat(80) + '\n')

  const client = new Anthropic()

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  })

  if (response.stop_reason === 'max_tokens') {
    throw new Error(
      'Claude response was cut off (hit the max_tokens limit) before finishing — try again, or reduce the number of entities in your library.',
    )
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  )
  if (!textBlock) {
    throw new Error('Claude response did not include a text block')
  }

  return {
    job_id: '', // Will be set by the caller
    analyzed_at: new Date().toISOString(),
    ...parseRankingResponse(textBlock.text),
  }
}
