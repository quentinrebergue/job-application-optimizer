import OpenAI from 'openai'
import type { EntityMeta, AIRanking } from '@/types'
import { getTaxonomy, resolveTagsToNodes, getSubtreeAliases } from '@/lib/data'

// Lazy client — only instantiated when called. Requires OPENAI_API_KEY in .env.local
function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Add it to .env.local')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function rankEntities(
  userId: string,
  jobDescription: string,
  entities: EntityMeta[]
): Promise<AIRanking[]> {
  const client = getClient()

  // Build taxonomy-enriched tag context
  let taxonomyContext = ''
  try {
    const { nodes } = await getTaxonomy(userId)
    const allTags = [...new Set(entities.flatMap((e) => e.tags))]
    const resolvedNodeIds = resolveTagsToNodes(allTags, nodes)
    if (resolvedNodeIds.length > 0) {
      // For each matched root area, enumerate all aliases (so AI knows synonyms)
      const rootIds = resolvedNodeIds.filter((id) => {
        const n = nodes.find((x) => x.id === id)
        return n && n.parent === null
      })
      const lines = rootIds.map((rootId) => {
        const rootLabel = nodes.find((n) => n.id === rootId)?.label ?? rootId
        const aliases = getSubtreeAliases(rootId, nodes)
        return `  • ${rootLabel}: ${aliases.slice(0, 12).join(', ')}${aliases.length > 12 ? ', ...' : ''}`
      })
      if (lines.length) {
        taxonomyContext = `\nTag Taxonomy Context (synonym clusters for matching):\n${lines.join('\n')}\n`
      }
    }
  } catch {
    // taxonomy unavailable — proceed without it
  }

  const entityDescriptions = entities
    .map((e) => {
      const name = e.type === 'skills' ? e.name : e.type === 'education' ? e.degree : e.title
      return `- ID: ${e.id} | Name: ${name} | Tags: ${e.tags.join(', ')}`
    })
    .join('\n')

  const prompt = `You are an ATS expert. Score each resume entity for relevance to the job description (0.0 = not relevant, 1.0 = highly relevant).
${taxonomyContext}
Job Description:
${jobDescription}

Resume Entities:
${entityDescriptions}

Respond ONLY with a JSON object: { "rankings": [{"entity_id": "...", "score": 0.95}, ...] }
Include ALL entity IDs.`

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const content = completion.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(content) as { rankings?: unknown[] }
  const raw = parsed.rankings ?? []

  return (raw as AIRanking[])
    .filter(
      (r): r is AIRanking =>
        typeof r === 'object' &&
        r !== null &&
        typeof r.entity_id === 'string' &&
        typeof r.score === 'number'
    )
    .sort((a, b) => b.score - a.score)
}

