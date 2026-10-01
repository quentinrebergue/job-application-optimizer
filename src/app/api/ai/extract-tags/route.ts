import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getTaxonomy, getTagsFromText, getNodePath } from '@/lib/data'
import { getSessionUserId } from '@/lib/auth/session'

const BodySchema = z.object({
  text: z.string().min(1),
})

/**
 * POST /api/ai/extract-tags
 * Body: { text: string }
 *
 * Scans the given text for taxonomy aliases (whole-word, case-insensitive) and returns:
 * - nodeIds: matched taxonomy node ids (including ancestors)
 * - nodes: matched nodes with label + path
 * - aliases: all aliases belonging to matched nodes (canonical tag strings to store)
 * - unmatched: potential tech terms in the text that didn't match any alias
 *              → pass these to POST /api/ai/reconcile-tags to clean them up
 *
 * No external AI call — purely deterministic.
 */
export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const { nodes } = await getTaxonomy(userId)
    const matchedIds = getTagsFromText(parsed.data.text, nodes)

    const result = matchedIds.map((id) => {
      const node = nodes.find((n) => n.id === id)
      return {
        id,
        label: node?.label ?? id,
        path: getNodePath(id, nodes),
        aliases: node?.aliases ?? [],
      }
    })

    // Canonical alias strings to actually store on entities
    const aliases = [...new Set(
      matchedIds.flatMap((id) => nodes.find((n) => n.id === id)?.aliases ?? [])
    )]

    // Surface potential tech terms that appeared in the text but didn't match anything.
    // Extract capitalised words / known tech patterns that look like tools/languages.
    const knownMatchedAliases = new Set(
      matchedIds.flatMap((id) => (nodes.find((n) => n.id === id)?.aliases ?? []).map((a) => a.toLowerCase()))
    )
    const candidateTokens = extractCandidateTokens(parsed.data.text)
    const unmatched = candidateTokens.filter((t) => !knownMatchedAliases.has(t.toLowerCase()))

    return NextResponse.json({ nodeIds: matchedIds, nodes: result, aliases, unmatched })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Extract failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * Heuristic extraction of candidate tech terms from text:
 * - Uppercase acronyms (C++, FPGA, RTOS, AWS)
 * - CamelCase words (TypeScript, PostgreSQL, TensorFlow)
 * - Words after "using", "with", "knowledge of", "experience with", etc.
 * Returns deduplicated list.
 */
function extractCandidateTokens(text: string): string[] {
  const candidates = new Set<string>()

  // Acronyms / all-caps words 2–8 chars, may end in ++
  const acronymRe = /\b([A-Z][A-Z0-9+#]{1,7})\b/g
  for (const m of text.matchAll(acronymRe)) candidates.add(m[1])

  // CamelCase or PascalCase words (at least one lowercase after uppercase)
  const camelRe = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g
  for (const m of text.matchAll(camelRe)) candidates.add(m[1])

  // Words following tech-signal phrases
  const contextRe = /(?:using|with|in|knowledge of|experience (?:with|in)|proficient in|familiar with)\s+([A-Za-z][A-Za-z0-9+#./\-]{1,20})/gi
  for (const m of text.matchAll(contextRe)) candidates.add(m[1].trim())

  return [...candidates].filter((t) => t.length >= 2)
}

