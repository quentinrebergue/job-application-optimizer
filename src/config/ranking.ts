/**
 * What the AI ranking puts on a resume. The AI rates every entry; the code
 * chooses, so these numbers are changed here and not in the prompt (#184).
 */

/** How many entries of each type are recommended. */
export const RANKING_LIMITS = {
  experiences: { min: 2, max: 4 },
  projects: { min: 3, max: 5 },
  skills: { min: 2, max: 4 },
} as const

/** Levels: 3 strong, 2 good, 1 weak, 0 none. From this level on, an entry is recommended. */
export const RECOMMEND_FROM_LEVEL = 2

export const MATCH_LABELS = ['No match', 'Fair match', 'Good match', 'Excellent match'] as const
