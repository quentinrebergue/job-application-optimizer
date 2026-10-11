import type { Metadata } from 'next'
import Link from 'next/link'
import { StatusPage } from '@/components/layout/StatusPage'
import { buttonClasses } from '@/components/ui/Button'

export const metadata: Metadata = { title: 'Not found' }

// A page of the app that does not exist for this user: an unknown or deleted job, an unknown library type.
export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Not found"
      actions={<Link href="/jobs" className={buttonClasses()}>Back to your jobs</Link>}
    >
      This job or entry does not exist, or it was deleted.
    </StatusPage>
  )
}
