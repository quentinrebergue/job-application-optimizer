import { notFound } from 'next/navigation'
import { isModuleEnabled } from '@/config'

// The module can be switched off in src/config/modules.ts; its pages then return 404.
export default function TaxonomyLayout({ children }: { children: React.ReactNode }) {
  if (!isModuleEnabled('taxonomy')) notFound()
  return children
}
