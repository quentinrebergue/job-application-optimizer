import { parse } from 'yaml'

/**
 * Other ways of writing the request and the answer, to try whether one is cheaper
 * than JSON. Only the evaluation picks them (--answer-format, --library-format);
 * the app uses JSON. Same keys and same values in every format.
 */

export type AnswerFormat = 'json' | 'yaml' | 'yaml-compact'
export type LibraryFormat = 'text' | 'yaml'
export interface PromptOptions {
  answerFormat?: AnswerFormat
  libraryFormat?: LibraryFormat
  /** false: the JSON answer is not held to a schema (the code still validates it). An experiment. */
  schema?: boolean
  /** 'code': the offer is cleaned with plain rules before it is sent (see offer.ts). */
  cleanOffer?: 'code'
}

export const ANSWER_FORMATS: AnswerFormat[] = ['json', 'yaml', 'yaml-compact']
export const LIBRARY_FORMATS: LibraryFormat[] = ['text', 'yaml']

/** What the AI is told about the layout of its answer, and the same example in each format. */
export const ANSWER_LAYOUT: Record<AnswerFormat, { instruction: string; example: string; system: string }> = {
  json: {
    instruction: 'One JSON object, nothing else, written minified on a single line (no indentation, no line breaks, no space after : or ,):',
    example: '{"ats_tags":["keyword"],"levels":{"E1":3,"E2":0,"P1":2,"S1":3},"best":{"experiences":[{"id":"E1","why":"at most 10 words"}],"projects":[{"id":"P3","why":"at most 10 words"}],"skills":[{"id":"S1","tags":[1,4,5]}]},"new_skill_tags":[{"skill":"S1","tag":"Go"}]}',
    system: 'You answer with a single valid JSON object and nothing else.',
  },
  yaml: {
    instruction: 'YAML, nothing else, no code fence, laid out like this:',
    example: `ats_tags:
  - keyword
levels:
  E1: 3
  E2: 0
  P1: 2
  S1: 3
best:
  experiences:
    - id: E1
      why: at most 10 words
  projects:
    - id: P3
      why: at most 10 words
  skills:
    - id: S1
      tags: [1, 4, 5]
new_skill_tags:
  - skill: S1
    tag: Go`,
    system: 'You answer in YAML only, with no code fence and nothing else.',
  },
  'yaml-compact': {
    instruction: 'YAML, nothing else, no code fence, laid out like this (lists and small maps on one line, every text in double quotes):',
    example: `ats_tags: ["keyword"]
levels: {E1: 3, E2: 0, P1: 2, S1: 3}
best:
  experiences: [{id: E1, why: "at most 10 words"}]
  projects: [{id: P3, why: "at most 10 words"}]
  skills: [{id: S1, tags: [1, 4, 5]}]
new_skill_tags: [{skill: S1, tag: "Go"}]`,
    system: 'You answer in YAML only, with no code fence and nothing else.',
  },
}

/**
 * The example of the answer with the two keys of the header (#294), before "new_skill_tags": a title on one line and
 * the paragraph of the profile. Asked only when the candidate has a title or a profile.
 */
export function exampleWithHeader(format: AnswerFormat): string {
  const { example } = ANSWER_LAYOUT[format]
  if (format === 'json') return example.replace('"new_skill_tags"', '"title":"one line","profile":"the paragraph","new_skill_tags"')
  if (format === 'yaml') return example.replace('new_skill_tags:', 'title: one line\nprofile: the paragraph\nnew_skill_tags:')
  return example.replace('new_skill_tags:', 'title: "one line"\nprofile: "the paragraph"\nnew_skill_tags:')
}

/** The YAML the AI wrote, as a value; a code fence around it is tolerated. */
export function parseYamlAnswer(text: string): unknown {
  const body = text.trim().replace(/^```(?:ya?ml)?[ \t]*\n/i, '').replace(/\n```[ \t]*$/, '')
  try {
    return parse(body)
  } catch (error) {
    throw new Error('The AI answer is not valid YAML.', { cause: error })
  }
}
