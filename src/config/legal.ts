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
export const LEGAL_UPDATED = '2026-10-09'

/**
 * Statements that are true only once a ticket ships. Switch the flag in the
 * same pull request as the work, so the pages never say something the code does not do.
 */

/** The company that runs the AI model (#192), as the privacy page names it. */
export const AI_PROVIDER = {
  name: 'Mistral AI',
  seat: 'Paris, France',
  website: 'https://mistral.ai',
  trustCenter: 'https://trust.mistral.ai/subprocessors',
}

/**
 * #192: the ranking runs on Mistral AI's API. Switch it in the pull request that points the gateway at Mistral.
 * Only valid with AI_TRAINING_OPTED_OUT (a test checks it).
 */
export const AI_ON_MISTRAL = true
/**
 * The opt-out of training is set in the Mistral console: Admin, API, Privacy, "Allow the use of your API calls to
 * train Mistral's AI models" is off (seen on 2026-10-09; it covers new calls only). Keep "Enable Labs models" off:
 * Labs models are trained on whatever the setting says. Mistral's terms let it train on customer data unless the
 * customer opts out, so switch this to false if the setting is ever turned back on.
 */
export const AI_TRAINING_OPTED_OUT = true
/** Mistral approved zero data retention for the account (a support request, shown in the console once approved). */
export const AI_ZERO_RETENTION = false
/** #104: account page with "export my data" and "delete my account". */
export const ACCOUNT_TOOLS = true
