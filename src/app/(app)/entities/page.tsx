import { redirect } from 'next/navigation'
import { libraryHref, parseLibraryTab } from '@/lib/entity-filter'

// The library lives in the Resume page now; old links keep their kind.
export default async function EntitiesPage({ searchParams }: PageProps<'/entities'>) {
  redirect(libraryHref(parseLibraryTab((await searchParams).tab)))
}
