'use client'

import { ErrorPage } from '@/components/layout/ErrorPage'

export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorPage retry={retry} backHref="/jobs" backLabel="Back to your jobs" />
}
