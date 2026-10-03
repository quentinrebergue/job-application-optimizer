import { Wordmark } from '@/components/layout/Wordmark'

// Shell of the pages a visitor sees before signing in: no app navigation.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-2 border-ink px-4 py-4 md:px-8">
        <Wordmark />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
