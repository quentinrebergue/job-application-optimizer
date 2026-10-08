import type { Metadata, Viewport } from 'next'
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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={dmSans.variable}
      style={{ colorScheme: 'light' }}
    >
      <body className="bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  )
}
