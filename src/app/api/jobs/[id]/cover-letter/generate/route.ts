import { NextResponse } from 'next/server'
import { getJob } from '@/lib/data/jobs'
import { listSentences, getJobCoverLetter, saveJobCoverLetter } from '@/lib/data/cover-letter'
import type { CoverLetterSentence } from '@/types/cover-letter'
import { COVER_LETTER_CATEGORY_LABELS } from '@/types/cover-letter'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`)
  const data = await res.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> }
  return data.candidates[0]?.content?.parts[0]?.text ?? ''
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
  }

  const job = await getJob(id)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const { selected_sentence_ids, ai_context } = await req.json() as {
    selected_sentence_ids: string[]
    ai_context?: string
  }

  const allSentences = await listSentences()
  const selected = allSentences.filter((s) => selected_sentence_ids.includes(s.id))

  const groupedSentences = selected.reduce<Record<string, CoverLetterSentence[]>>((acc, s) => {
    const label = COVER_LETTER_CATEGORY_LABELS[s.category]
    acc[label] = [...(acc[label] ?? []), s]
    return acc
  }, {})

  const sentencesBlock = Object.entries(groupedSentences)
    .map(([cat, items]) => `[${cat}]\n${items.map((s) => `• ${s.text}`).join('\n')}`)
    .join('\n\n')

  const prompt = `You are writing a professional cover letter for a job application.

## Target Job
Company: ${job.company}
Title: ${job.title}
${job.location ? `Location: ${job.location}` : ''}

## Job Description
${job.description}

## Candidate's Sentence Bank
The candidate has selected the following sentences, grouped by category, that they want incorporated or used as inspiration in the letter. Use as many as naturally fit — don't force all of them.

${sentencesBlock}

${ai_context ? `## Additional Context\n${ai_context}` : ''}

## Instructions
Write a complete, professional cover letter addressed to the hiring team at ${job.company}.
- 3–4 paragraphs, no more than 350 words
- Opening paragraph: hook the reader, state the position
- Middle paragraph(s): connect the candidate's background to the role, draw from the selected sentences
- Closing paragraph: express enthusiasm, call to action
- Use plain text only — no markdown, no asterisks, no headers
- Do NOT invent specific facts not supported by the provided sentences
- Match the tone to the company (${job.company}) and role level

Output only the cover letter text, nothing else.`

  const letter = await callGemini(prompt)

  const current = await getJobCoverLetter(id)
  await saveJobCoverLetter(id, {
    ...current,
    selected_sentence_ids,
    generated_letter: letter.trim(),
    ai_context: ai_context ?? current.ai_context,
  })

  return NextResponse.json({ letter: letter.trim() })
}
