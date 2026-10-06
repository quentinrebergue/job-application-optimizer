import { AppHeader } from '@/components/layout/AppHeader'
import { VerifyEmailBanner } from '@/components/layout/VerifyEmailBanner'
import { getCurrentUser } from '@/lib/auth/dal'

// Shell of the signed-in app: one top bar at every width, then the page.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink focus:outline-2 focus:outline-accent-strong"
      >
        Skip to content
      </a>
      <AppHeader userEmail={user?.email ?? null} />
      {user && !user.emailVerified && <VerifyEmailBanner email={user.email} />}
      <main id="main" className="min-w-0">
        {children}
      </main>
    </>
  )
}
