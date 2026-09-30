/**
 * call-handlers-entities.ts
 *
 * MCP tool call handlers for resume entities (experiences, projects,
 * skills, education), general Q&A flashcards, and the tag taxonomy.
 */

import fs from 'fs/promises'
import path from 'path'
import { DATA_DIR } from './config.js'
import { createExperience, createProject, createSkill, createEducation, listEntities, type SkillLevel } from './entities.js'
import {
  getTaxonomy, createTaxonomyNode, updateTaxonomyNode, deleteTaxonomyNode,
  addTaxonomyAlias, removeTaxonomyAlias, reconcileTags,
} from './taxonomy.js'
import type { ToolResult } from './tool-result.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleEntityToolCall(name: string, args: Record<string, any>): Promise<ToolResult | null> {
  if (name === 'create_experience') {
    const { title, company, period, description, tags, latex_snippet } = args as {
      title: string; company: string; period: string; description: string; tags?: string[]; latex_snippet?: string
    }
    const entity = await createExperience(DATA_DIR, { title, company, period, description, tags, latex_snippet })
    return {
      content: [{
        type: 'text',
        text: `✓ Experience "${entity.title}" at ${entity.company} (${entity.period})\n  ID: ${entity.id}\n  View: http://localhost:3000/entities/experiences`,
      }],
    }
  }

  if (name === 'create_project') {
    const { title, tech, description, tags, latex_snippet } = args as {
      title: string; tech: string[]; description: string; tags?: string[]; latex_snippet?: string
    }
    const entity = await createProject(DATA_DIR, { title, tech, description, tags, latex_snippet })
    return {
      content: [{
        type: 'text',
        text: `✓ Project "${entity.title}" [${entity.tech.join(', ')}]\n  ID: ${entity.id}\n  View: http://localhost:3000/entities/projects`,
      }],
    }
  }

  if (name === 'create_skill') {
    const { name: skillName, category, level, tags, latex_snippet } = args as {
      name: string; category: string; level: SkillLevel; tags?: string[]; latex_snippet?: string
    }
    const entity = await createSkill(DATA_DIR, { name: skillName, category, level, tags, latex_snippet })
    return {
      content: [{
        type: 'text',
        text: `✓ Skill "${entity.name}" (${entity.category}, ${entity.level})\n  ID: ${entity.id}\n  View: http://localhost:3000/entities/skills`,
      }],
    }
  }

  if (name === 'create_education') {
    const { degree, institution, period, tags, latex_snippet } = args as {
      degree: string; institution: string; period: string; tags?: string[]; latex_snippet?: string
    }
    const entity = await createEducation(DATA_DIR, { degree, institution, period, tags, latex_snippet })
    return {
      content: [{
        type: 'text',
        text: `✓ Education "${entity.degree}" at ${entity.institution} (${entity.period})\n  ID: ${entity.id}\n  View: http://localhost:3000/entities/education`,
      }],
    }
  }

  if (name === 'list_entities') {
    const { type } = args as { type: 'experiences' | 'projects' | 'skills' | 'education' }
    const entities = await listEntities(DATA_DIR, type)
    if (entities.length === 0) return { content: [{ type: 'text', text: `No ${type} yet.` }] }
    const lines = entities.map((e) => {
      if (e.type === 'experiences') return `[${e.id}]  ${e.title} @ ${e.company} (${e.period})`
      if (e.type === 'projects') return `[${e.id}]  ${e.title} [${e.tech.join(', ')}]`
      if (e.type === 'education') return `[${e.id}]  ${e.degree} @ ${e.institution} (${e.period})`
      return `[${e.id}]  ${e.name} — ${e.category} (${e.level})`
    })
    return { content: [{ type: 'text', text: lines.join('\n') }] }
  }

  if (name === 'add_general_question') {
    const { question, answer, tags = [] } = args as { question: string; answer: string; tags?: string[] }
    if (!question?.trim() || !answer?.trim()) {
      return { content: [{ type: 'text', text: 'Error: question and answer are required.' }], isError: true }
    }
    const { v4: uuidv4 } = await import('uuid')
    const id = `gq-${uuidv4().slice(0, 8)}`
    const gq = { id, question: question.trim(), answer: answer.trim(), tags }
    const gqPath = path.join(DATA_DIR, 'general-questions', `${id}.json`)
    await fs.writeFile(gqPath, JSON.stringify(gq, null, 2))
    return {
      content: [{
        type: 'text',
        text: `✓ Added flashcard "${id}"\n  Tags: ${tags.length ? tags.join(', ') : '(none)'}\n  Q: ${question.slice(0, 80)}${question.length > 80 ? '…' : ''}`,
      }],
    }
  }

  if (name === 'get_taxonomy') {
    const tax = await getTaxonomy()
    return { content: [{ type: 'text', text: JSON.stringify(tax, null, 2) }] }
  }

  if (name === 'create_taxonomy_node') {
    const { label, parent = null, aliases, description } = args as {
      label: string; parent?: string; aliases?: string[]; description?: string
    }
    const node = await createTaxonomyNode({ label, parent: parent ?? null, aliases, description })
    return { content: [{ type: 'text', text: `✓ Created node "${node.label}" (id: ${node.id})` }] }
  }

  if (name === 'update_taxonomy_node') {
    const { id, ...patch } = args as { id: string; label?: string; parent?: string; description?: string }
    const node = await updateTaxonomyNode(id, patch)
    if (!node) return { content: [{ type: 'text', text: `Error: node "${id}" not found` }], isError: true }
    return { content: [{ type: 'text', text: `✓ Updated node "${node.label}"` }] }
  }

  if (name === 'delete_taxonomy_node') {
    const { id, cascade = false } = args as { id: string; cascade?: boolean }
    const ok = await deleteTaxonomyNode(id, cascade)
    if (!ok) return { content: [{ type: 'text', text: `Error: node "${id}" not found` }], isError: true }
    return { content: [{ type: 'text', text: `✓ Deleted node "${id}"` }] }
  }

  if (name === 'add_node_alias') {
    const { nodeId, alias } = args as { nodeId: string; alias: string }
    const node = await addTaxonomyAlias(nodeId, alias)
    if (!node) return { content: [{ type: 'text', text: `Error: node "${nodeId}" not found` }], isError: true }
    return { content: [{ type: 'text', text: `✓ Added alias "${alias}" to "${node.label}"` }] }
  }

  if (name === 'remove_node_alias') {
    const { nodeId, alias } = args as { nodeId: string; alias: string }
    const node = await removeTaxonomyAlias(nodeId, alias)
    if (!node) return { content: [{ type: 'text', text: `Error: node "${nodeId}" not found` }], isError: true }
    return { content: [{ type: 'text', text: `✓ Removed alias "${alias}" from "${node.label}"` }] }
  }

  if (name === 'reconcile_tags') {
    const { tags } = args as { tags: string[] }
    const result = await reconcileTags(tags)
    const lines: string[] = []
    if (result.matched.length) {
      lines.push(`✓ Matched (${result.matched.length}):`)
      for (const m of result.matched) lines.push(`  • "${m.tag}" → ${m.path}`)
    }
    if (result.aliasable.length) {
      lines.push(`\n⚡ Should be added as alias (${result.aliasable.length}):`)
      for (const a of result.aliasable)
        lines.push(`  • "${a.tag}" → alias of "${a.label}" (${a.path}) — confidence ${(a.confidence * 100).toFixed(0)}%`)
      lines.push(`  → Use add_node_alias to register these.`)
    }
    if (result.novel.length) {
      lines.push(`\n🆕 Novel / not in taxonomy (${result.novel.length}):`)
      for (const n of result.novel) {
        const parent = n.suggestedParentLabel ? ` under "${n.suggestedParentLabel}"` : ' (root)'
        lines.push(`  • "${n.tag}" → suggested node: "${n.suggestedLabel}"${parent}`)
      }
      lines.push(`  → Use create_taxonomy_node to add these.`)
    }
    return { content: [{ type: 'text', text: lines.join('\n') || 'No tags to reconcile.' }] }
  }

  return null
}
