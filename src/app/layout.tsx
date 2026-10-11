import type { Metadata, Viewport } from 'next'
import { connection } from 'next/server'
import { DM_Sans } from 'next/font/google'
import { SITE_URL } from '@/config/legal'
import './globals.css'

// The only interface font (#90), variable so every weight is real, not faked.
// Exposed as a CSS variable that the --font-sans token in globals.css reads.
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Pages set `metadata.title`; the tab then reads "Jobs · FastResume".
  title: { default: 'FastResume', template: '%s · FastResume' },
  description: 'From a job offer to a tailored resume in a couple of clicks.',
  // The preview card of a shared link; the image is app/opengraph-image.tsx.
  openGraph: { siteName: 'FastResume', type: 'website', locale: 'en' },
  twitter: { card: 'summary_large_image' },
}

// Only the document shell. The navigation lives in the route groups:
// (app)/layout.tsx for signed-in pages, (public)/layout.tsx for the others.
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Every page is rendered at the request: the Content Security Policy has a nonce of its own for each
  // request, and Next.js can only put it on a page that is not built ahead (#205). The colour scheme is
  // set in globals.css, so the root element needs no style attribute.
  await connection()
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  )
}
