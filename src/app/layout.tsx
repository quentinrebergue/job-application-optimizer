import type { Metadata, Viewport } from 'next'
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import 'highlight.js/styles/atom-one-dark.css'

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
  // Pages set `metadata.title`; the tab then reads "Jobs · FastResume".
  title: { default: 'FastResume', template: '%s · FastResume' },
  description: 'From a job offer to a tailored resume in a couple of clicks.',
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
      className={`${instrumentSans.variable} ${jetBrainsMono.variable}`}
      style={{ colorScheme: 'light' }}
    >
      <body className="bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  )
}
