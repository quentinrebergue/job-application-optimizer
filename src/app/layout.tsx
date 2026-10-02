import type { Metadata, Viewport } from 'next'
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import 'highlight.js/styles/atom-one-dark.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { getCurrentUser } from '@/lib/auth/dal'

// Interface font and data font (scores, dates, ids). Exposed as CSS variables,
// which the tokens in globals.css (--font-sans, --font-mono) read.
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument-sans' })
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Job Application Optimizer',
  description: 'Optimize your job applications with resume builder, job tracker, and interview training',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${jetBrainsMono.variable}`}
      style={{ colorScheme: 'light' }}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body className="bg-canvas font-sans text-ink antialiased">
        <div className="flex min-h-screen">
          <Sidebar userEmail={user?.email ?? null} />
          <main className="flex-1 overflow-auto min-w-0 main-content">
            {children}
          </main>
        </div>
        <MobileNav />
      </body>
    </html>
  )
}
