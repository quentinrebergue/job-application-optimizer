// How long each piece of text a user can save may be, and how big a request may be (#201).
//
// One table for the server (zod schemas, body size), the forms (maxLength, counters) and the
// tests, so they cannot drift apart. These are constants in the code on purpose: the database
// and the interface depend on them. The AI limits, which are adjusted from real usage, come
// from the environment (#203).
//
// Measured on the 45 real offers kept for the evaluation (`npm run eval:ranking -- --sizes`):
// the longest offer is 9,332 characters. With the instructions (1,553) and a full library
// (5,938), an offer at its limit keeps the AI prompt under the gateway's 30,000 characters.

export const LIMITS = {
  job: { title: 150, company: 100, location: 100, url: 2000, description: 15000 },
  experiences: { title: 150, company: 100, location: 100, period: 50, description: 5000 },
  projects: { title: 150, description: 5000 },
  skills: { name: 150, category: 50 },
  education: { degree: 150, institution: 150, period: 50 },
  /** One keyword, and how many an entry or a job may have. */
  tag: 50,
  tagsPerEntry: 30,
  /** Hand-written LaTeX kept with an entry. */
  latexSnippet: 5000,
  /** The profile of the user, also the defaults of every resume (src/schemas/resume-profile.ts). */
  profile: { full_name: 200, email: 320, linkedin: 300, phone: 50, address: 300, resume_title: 200, profile_text: 5000, ai_context: 5000 },
  /** The resume of one job: its title, profile text and AI context have the profile's limits. */
  resume: { entityDescription: 5000, items: 500, id: 100, optionKeys: 50, optionValue: 100 },
} as const

/** A field allowed this many characters or more is a long text: the form shows a counter. */
export const LONG_TEXT_FROM = 1000

/** The biggest JSON body a route reads; above it the answer is 413 before the body is parsed. */
export const MAX_BODY_BYTES = {
  default: 100 * 1024,
  resumeConfig: 200 * 1024,
} as const
