// What the privacy, legal notice and terms pages state about who runs the site.
// One place, so the pages and the footer never disagree. Ticket #106.

/** Public address of the site: for robots.txt, the sitemap and link previews (built once, so not read from the environment). */
export const SITE_URL = 'https://fastresume.tech'
export const PUBLISHER_NAME = 'Quentin Rebergue'
export const CONTACT_EMAIL = 'contact@fastresume.tech'

/** The hosting provider, as French law (LCEN) wants it in the legal notice. */
export const HOST = {
  name: 'OVH SAS',
  address: '2 rue Kellermann, 59100 Roubaix, France',
  website: 'https://www.ovhcloud.com',
}

/** Date of the last change of the three pages. Update it with the text. */
export const LEGAL_UPDATED = '2026-10-08'

/**
 * Statements that are true only once a ticket ships. Switch the flag in the
 * same pull request as the work, so the pages never say something the code does not do.
 */
/** #44: the AI runs on open-source models hosted by OVHcloud in France, and Claude and Gemini are removed. */
export const AI_ON_OVHCLOUD = false
/** #44: names and contact details are removed from what the AI receives. Only meaningful with AI_ON_OVHCLOUD. */
export const AI_ANONYMISED = false
/** #104: account page with "export my data" and "delete my account". */
export const ACCOUNT_TOOLS = false
