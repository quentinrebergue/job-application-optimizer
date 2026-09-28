import type { EntityMeta } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { buildRankingPrompt, parseRankingResponse } from './ranking-prompt'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string
    }>
  }>
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
  }>
}

export async function rankJobWithGemini(
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
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable not set')
  }

  const prompt = buildRankingPrompt(jobTitle, jobCompany, jobDescription, entities, aiContext)

  const requestBody: GeminiRequest = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  }

  console.log('\n' + '═'.repeat(80))
  console.log('GEMINI PROMPT')
  console.log('═'.repeat(80))
  console.log(prompt)
  console.log('═'.repeat(80) + '\n')

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data: GeminiResponse = await response.json()
  const responseText = data.candidates[0].content.parts[0].text

  return {
    job_id: '', // Will be set by the caller
    analyzed_at: new Date().toISOString(),
    ...parseRankingResponse(responseText),
  }
}
