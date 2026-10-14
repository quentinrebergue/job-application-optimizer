import { redirect } from 'next/navigation'
import { libraryHref, parseEntityType } from '@/lib/entity-filter'

// A new entry is made in a dialog of the library now; an old address (?type=) opens it on the same kind.
export default async function NewEntityPage({ searchParams }: PageProps<'/entities/new'>) {
  const type = parseEntityType((await searchParams).type) ?? 'experiences'
  redirect(libraryHref(type, { creating: type }))
}
