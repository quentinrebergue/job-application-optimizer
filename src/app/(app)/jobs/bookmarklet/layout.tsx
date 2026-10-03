import { notFound } from 'next/navigation'
import { FEATURES } from '@/config'

// The bookmarklet is set aside (#81); its page returns 404 until it is switched back on.
export default function BookmarkletLayout({ children }: { children: React.ReactNode }) {
  if (!FEATURES.linkedinImport) notFound()
  return children
}
