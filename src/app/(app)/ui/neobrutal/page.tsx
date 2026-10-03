import { notFound } from 'next/navigation'
import { DirectionComparison } from '@/components/catalogue/DirectionComparison'
import './themes.css'

export const metadata = { title: 'UI direction' }

// Internal page to choose the visual direction (#85); development only.
export default function UiDirectionPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <DirectionComparison />
}
