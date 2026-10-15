// Shown while a page of the app loads (a Suspense fallback around the page, with the app's bar in place).
export default function Loading() {
  return (
    <p role="status" className="mx-auto w-full max-w-page p-gutter text-small text-ink-muted">
      Loading…
    </p>
  )
}
