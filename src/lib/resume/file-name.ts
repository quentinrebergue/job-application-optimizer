// The name under which the PDF of a job's resume is downloaded (#293): resume_firstname.lastname_company.pdf, safe for
// every file system. Pure: the server announces it in Content-Disposition and the browser saves under that very name.

/** The longest a part of the name may be, so the whole stays well under the 255 bytes of most file systems. */
const PART_MAX = 30
/** The words of the job title added when two jobs share a company. */
const TITLE_WORDS = 3
const FALLBACK = 'resume.pdf'

/** Lower case, no accent, letters and digits only, words joined by a hyphen; empty when nothing is left (a name in Chinese). */
function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, PART_MAX)
    .replace(/-+$/, '')
}

/** "Quentin Rebergue" → "quentin.rebergue"; "Jean de La Fontaine" → "jean.de-la-fontaine"; one word stays alone. */
function personPart(fullName: string): string {
  const [first = '', ...rest] = fullName.trim().split(/\s+/)
  return [slug(first), slug(rest.join(' '))].filter(Boolean).join('.')
}

export interface FileNameInput {
  /** Full name of the profile. */
  fullName: string
  company: string
  title: string
  /** Another job of the same user is at the same company: the title tells them apart. */
  sharesCompany?: boolean
}

/** The file name of a resume: what is missing is left out, and nothing at all gives `resume.pdf`. */
export function resumeFileName({ fullName, company, title, sharesCompany = false }: FileNameInput): string {
  const titlePart = sharesCompany ? slug(title.trim().split(/\s+/).slice(0, TITLE_WORDS).join(' ')) : ''
  const parts = [personPart(fullName), slug(company), titlePart].filter(Boolean)
  return parts.length === 0 ? FALLBACK : `resume_${parts.join('_')}.pdf`
}

/** The name the server announced, read from its Content-Disposition; `resume.pdf` when it did not. */
export function fileNameFromDisposition(header: string | null): string {
  const match = header && /filename="([^"\\/]+)"/.exec(header)
  return match ? match[1] : FALLBACK
}
