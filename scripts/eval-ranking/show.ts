import type { AIAnalysisResult } from '@/types/job'
import type { Expected } from './metrics'

const TYPES = [
  ['experiences', 'EXPERIENCES', 'recommended_experience_ids'],
  ['projects', 'PROJECTS', 'recommended_project_ids'],
  ['skills', 'SKILLS', 'recommended_skill_ids'],
] as const

/**
 * What the AI answered, as the app understood it: for each type, every entry in
 * order with its level and reason, what the app recommends (*) and what I
 * expected (+ expected and recommended, - expected but not recommended).
 */
export function formatAnswer(analysis: AIAnalysisResult, expected: Expected): string {
  const lines: string[] = [`ATS tags: ${analysis.ats_tags.join(', ') || '(none)'}`]
  for (const [type, title, recommendedKey] of TYPES) {
    const recommended = new Set(analysis[recommendedKey])
    const wanted = new Set(expected[type] ?? [])
    lines.push('', title)
    for (const e of analysis.entities_by_type[type]) {
      const mark = recommended.has(e.id) ? '*' : ' '
      const check = wanted.has(e.id) ? (recommended.has(e.id) ? '+' : '-') : ' '
      const why = e.reason ? `  ${e.reason}` : ''
      lines.push(`  ${String(e.rank ?? '').padStart(2)}. [${e.level ?? '?'}] ${mark}${check} ${e.name}${why}`)
    }
  }
  if (analysis.recommended_title || analysis.recommended_profile) {
    lines.push('', 'HEADER FOR THIS OFFER')
    if (analysis.recommended_title) lines.push(`  title: ${analysis.recommended_title}${analysis.title_new_terms?.length ? `   (new: ${analysis.title_new_terms.join(', ')})` : ''}`)
    if (analysis.recommended_profile) lines.push(`  profile: ${analysis.recommended_profile}${analysis.profile_new_terms?.length ? `   (new: ${analysis.profile_new_terms.join(', ')})` : ''}`)
  }
  lines.push('', '  * recommended by the app    + expected and recommended    - expected but not recommended')
  if (analysis.suggested_new_skills.length) {
    lines.push('', 'NEW SKILLS', ...analysis.suggested_new_skills.map((s) => `  ${s.name} (${s.category}): ${s.reason}`))
  }
  if (analysis.suggested_new_skill_tags.length) {
    lines.push('', 'NEW TAGS', ...analysis.suggested_new_skill_tags.map((t) => `  ${t.tag} -> ${t.skill_id}: ${t.reason}`))
  }
  return lines.join('\n')
}
