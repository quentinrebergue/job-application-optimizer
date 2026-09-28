import { NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import { getTaxonomy, resolveTagsToNodes, getNodePath } from '@/lib/data'
import type { TaxonomyNode } from '@/types'

const BodySchema = z.object({
  tags: z.array(z.string()).min(1),
})

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Add it to .env.local')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/** Format taxonomy for the AI prompt — each node with its id, label, path, and aliases */
function formatTaxonomyForPrompt(nodes: TaxonomyNode[]): string {
  return nodes
    .map((n) => {
      const path = getNodePath(n.id, nodes)
      const aliases = n.aliases.length ? n.aliases.join(', ') : '(none)'
      return `  ${n.id} | ${path} | aliases: ${aliases}`
    })
    .join('\n')
}

/**
 * POST /api/ai/reconcile-tags
 * Body: { tags: string[] }
 *
 * For each input tag:
 * 1. Exact alias match → "matched" (no AI needed)
 * 2. No match → ask GPT to classify as:
 *    - "alias": semantically equivalent to an existing node (suggest adding as alias)
 *    - "novel": genuinely new concept (suggest creating a node, optionally under a parent)
 *
 * Response:
 * {
 *   matched: [{ tag, nodeId, label, path }],
 *   aliasable: [{ tag, nodeId, label, path, confidence }],
 *   novel: [{ tag, suggestedLabel, suggestedParentId?, suggestedParentLabel? }]
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'tags array is required' }, { status: 400 })
    }

    const inputTags = [...new Set(parsed.data.tags.map((t) => t.trim()).filter(Boolean))]
    const { nodes } = await getTaxonomy()

    // ── Step 1: exact alias matching ──────────────────────────────────────────
    type Matched = { tag: string; nodeId: string; label: string; path: string }
    const matched: Matched[] = []
    const unmatched: string[] = []

    for (const tag of inputTags) {
      const resolved = resolveTagsToNodes([tag], nodes)
      // resolveTagsToNodes returns node + ancestors; find the most specific match
      const directMatch = nodes.find((n) =>
        n.aliases.some((a) => a.toLowerCase() === tag.toLowerCase())
      )
      if (directMatch) {
        matched.push({
          tag,
          nodeId: directMatch.id,
          label: directMatch.label,
          path: getNodePath(directMatch.id, nodes),
        })
      } else if (resolved.length > 0) {
        // Partial label match (e.g., node label itself matches)
        const labelMatch = nodes.find((n) => n.label.toLowerCase() === tag.toLowerCase())
        if (labelMatch) {
          matched.push({
            tag,
            nodeId: labelMatch.id,
            label: labelMatch.label,
            path: getNodePath(labelMatch.id, nodes),
          })
        } else {
          unmatched.push(tag)
        }
      } else {
        unmatched.push(tag)
      }
    }

    type Aliasable = { tag: string; nodeId: string; label: string; path: string; confidence: number }
    type Novel = { tag: string; suggestedLabel: string; suggestedParentId?: string; suggestedParentLabel?: string }
    let aliasable: Aliasable[] = []
    let novel: Novel[] = []

    // ── Step 2: AI classification for unmatched tags ──────────────────────────
    if (unmatched.length > 0) {
      const client = getClient()
      const taxonomyDump = formatTaxonomyForPrompt(nodes)

      const prompt = `You are a taxonomy expert. Below is an existing tag taxonomy tree (node_id | full_path | aliases).

TAXONOMY:
${taxonomyDump}

UNMATCHED TAGS to classify: ${unmatched.map((t) => `"${t}"`).join(', ')}

For each unmatched tag, decide:
- "alias": this tag is semantically equivalent to an existing node (or a common abbreviation/synonym). Provide the best matching node_id and a confidence 0.0–1.0.
- "novel": this is a genuinely new concept not covered by any node. Suggest a label and optionally the best parent node_id from the taxonomy.

Respond ONLY with a JSON object:
{
  "results": [
    { "tag": "RTOS", "decision": "alias", "nodeId": "multithreading-xxxx", "confidence": 0.85 },
    { "tag": "Quantum Computing", "decision": "novel", "suggestedLabel": "Quantum Computing", "suggestedParentId": "hardware-xxxx" }
  ]
}`

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      })

      const content = completion.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(content) as {
        results?: Array<{
          tag: string
          decision: 'alias' | 'novel'
          nodeId?: string
          confidence?: number
          suggestedLabel?: string
          suggestedParentId?: string
        }>
      }

      for (const item of parsed.results ?? []) {
        if (item.decision === 'alias' && item.nodeId) {
          const node = nodes.find((n) => n.id === item.nodeId)
          if (node) {
            aliasable.push({
              tag: item.tag,
              nodeId: node.id,
              label: node.label,
              path: getNodePath(node.id, nodes),
              confidence: item.confidence ?? 0.5,
            })
            continue
          }
        }
        // novel (or alias with unknown node)
        const parentNode = item.suggestedParentId
          ? nodes.find((n) => n.id === item.suggestedParentId)
          : undefined
        novel.push({
          tag: item.tag,
          suggestedLabel: item.suggestedLabel ?? item.tag,
          suggestedParentId: parentNode?.id,
          suggestedParentLabel: parentNode?.label,
        })
      }
    }

    return NextResponse.json({ matched, aliasable, novel })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Reconcile failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
