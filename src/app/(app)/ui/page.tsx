import { notFound } from 'next/navigation'
import { UiCatalogue } from '@/components/catalogue/UiCatalogue'

export const metadata = { title: 'UI catalogue' }

// Internal page to review every primitive and variant; development only.
export default function UiCataloguePage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <UiCatalogue />
}
