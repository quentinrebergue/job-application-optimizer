'use client'

import Link from 'next/link'
import { Button, buttonClasses } from '@/components/ui/Button'
import { StatusPage } from './StatusPage'

/** What an error boundary shows: try again (Next.js re-renders the page) or leave. */
export function ErrorPage({ retry, backHref, backLabel }: { retry: () => void; backHref: string; backLabel: string }) {
  return (
    <StatusPage
      code="Oops"
      title="Something went wrong"
      actions={
        <>
          <Button onClick={() => retry()}>Try again</Button>
          <Link href={backHref} className={buttonClasses({ variant: 'secondary' })}>{backLabel}</Link>
        </>
      }
    >
      This page did not load. It is probably temporary: try again in a moment. Nothing you saved is lost.
    </StatusPage>
  )
}
