// The web addresses a person types: the link of a project and the GitHub address of the profile (#322). They end up in
// the PDF as clickable links, so what is saved is a complete, plain address: no spaces, no other scheme than http(s),
// no password inside. Pure and client-safe (the forms and the server use the same rule).

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i

/**
 * The address as `https://host/path`, or "" for nothing typed, or null when it is not a web address. An address typed
 * without its scheme ("github.com/you/project") is read as https. Anything that is not http or https
 * ("javascript:...", "ftp://...", "mailto:...") is refused, and so is a host with no dot ("localhost", "foo").
 */
export function normalizeWebLink(raw: string): string | '' | null {
  const typed = raw.trim()
  if (typed === '') return ''
  if (/\s/.test(typed)) return null
  let url: URL
  try {
    url = new URL(SCHEME.test(typed) ? typed : `https://${typed}`)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username !== '' || url.password !== '') return null
  if (!url.hostname.includes('.') || url.hostname.endsWith('.')) return null
  return url.href
}

const GITHUB_NAME = /^[a-z0-9](?:[a-z0-9-]{0,38})$/i

/**
 * The GitHub address of a profile, as it is printed under the name: `github.com/name`. A bare user name
 * ("quentinrebergue") is completed; an address is kept if its host is github.com, without the scheme, the `www.`
 * and the trailing slash. "" for nothing typed, null for anything else.
 */
export function normalizeGithub(raw: string): string | '' | null {
  const typed = raw.trim()
  if (typed === '') return ''
  if (GITHUB_NAME.test(typed)) return `github.com/${typed}`
  const link = normalizeWebLink(typed)
  if (!link) return null
  const url = new URL(link)
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null
  return `github.com${url.pathname.replace(/\/+$/, '')}${url.search}`
}

/** The address as a link to open: the scheme added when it was left out. */
export function linkTarget(address: string): string {
  return SCHEME.test(address) ? address : `https://${address}`
}
