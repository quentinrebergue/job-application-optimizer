import type { SectionConfig } from '@/config'

function isUnder(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

/** True when `pathname` is one of the section's pages or sub-pages. */
export function isActiveSection(pathname: string, section: Pick<SectionConfig, 'href' | 'alsoActiveOn'>): boolean {
  return [section.href, ...(section.alsoActiveOn ?? [])].some((href) => isUnder(pathname, href))
}
