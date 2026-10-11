// Shown while a page of the app loads (a Suspense fallback around the page, with the app's bar in place).
export default function Loading() {
  return (
    <p role="status" className="mx-auto w-full max-w-7xl p-4 text-sm text-ink-muted md:p-8">
      Loading…
    </p>
  )
}
