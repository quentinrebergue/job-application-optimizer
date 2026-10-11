import type { EntityMeta } from '@/types'
import { ANSWER_LAYOUT } from './formats'
import { aiLimits } from './limits'
import { buildRankingPrompt } from './ranking-prompt'

// Is the ranking prompt small enough for the gateway? (#185) The gateway refuses a prompt over its
// limit with a 413 and no detail. The app builds the prompt, so it can check first, without
// reserving a call, and tell the user how big it is and what takes the room.

type Library = { experiences: EntityMeta[]; projects: EntityMeta[]; skills: EntityMeta[] }

export type SizeCheck = { ok: true; chars: number } | { ok: false; chars: number; max: number; message: string }

const count = (n: number) => n.toLocaleString('en-US')
const chars = (text: string) => [...text].length

const nameOf = (entity: EntityMeta) =>
  entity.type === 'skills' ? entity.name : entity.type === 'education' ? entity.degree : entity.title

/**
 * The size of the request as the gateway counts it (system prompt + prompt, in characters), checked
 * against its limit. Over it: a message the user can act on, naming what takes the room.
 */
export function checkPromptSize(
  jobTitle: string,
  jobCompany: string,
  jobDescription: string,
  entities: Library,
  max: number = aiLimits().maxPromptChars,
): SizeCheck {
  const { prompt, labels, parts, sizes } = buildRankingPrompt(jobTitle, jobCompany, jobDescription, entities)
  const total = chars(ANSWER_LAYOUT.json.system) + chars(prompt)
  if (total <= max) return { ok: true, chars: total }

  const library = chars(parts.experiences) + chars(parts.projects) + chars(parts.skills)
  const offer = chars(parts.offer)
  const longest = Object.entries(sizes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, size]) => `${nameOf(labels.get(label)!.entity)} (${count(size)})`)
  const advice = offer > library
    ? 'Shorten the offer'
    : `Remove the entries you do not need${longest.length ? `, or shorten the longest: ${longest.join(', ')}` : ''}`
  return {
    ok: false,
    chars: total,
    max,
    message: `Your library and this offer are too long for the AI to read in one go (${count(total)} of ${count(max)} characters: the library takes ${count(library)}, the offer ${count(offer)}). ${advice}, then try again.`,
  }
}
