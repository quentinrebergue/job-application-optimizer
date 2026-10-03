import { notFound, redirect } from 'next/navigation'
import { libraryHref, parseEntityType } from '@/lib/entity-filter'

// One kind of entry is the library on that kind: /entities/skills -> /resume?tab=skills.
export default async function EntityTypePage({ params }: PageProps<'/entities/[type]'>) {
  const type = parseEntityType((await params).type)
  if (!type) notFound()
  redirect(libraryHref(type))
}
