import { redirect } from 'next/navigation'
import { libraryHref, parseEntityType } from '@/lib/entity-filter'

// An entry opens in a dialog of the library now; an old address (a bookmark, a mail) still leads to it.
export default async function EntityDetailPage({ params }: PageProps<'/entities/[type]/[id]'>) {
  const { type, id } = await params
  redirect(libraryHref(parseEntityType(type) ?? 'experiences', { entry: id }))
}
