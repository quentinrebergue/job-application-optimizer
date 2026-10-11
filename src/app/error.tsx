'use client'

import { ErrorPage } from '@/components/layout/ErrorPage'

// A failure outside the app shell (the public pages have a layout of their own, which stays).
export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPage retry={retry} backHref="/" backLabel="Go to the home page" />
}
