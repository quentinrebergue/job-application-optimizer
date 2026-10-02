import type { ModuleConfig } from '@/config'

function isUnder(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

/** True when `pathname` is one of the module's pages or sub-pages. */
export function isActiveModule(pathname: string, mod: Pick<ModuleConfig, 'href' | 'alsoActiveOn'>): boolean {
  return [mod.href, ...(mod.alsoActiveOn ?? [])].some((href) => isUnder(pathname, href))
}
