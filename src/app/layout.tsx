import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'highlight.js/styles/atom-one-dark.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Job Application Optimizer',
  description: 'Optimize your job applications with resume builder, job tracker, and interview training',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <head>
        {/* Explicit meta tag — bypasses Next.js metadata system to guarantee it renders */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        {/* App shell */}
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto min-w-0 main-content">
            {children}
          </main>
        </div>
        {/* Mobile bottom nav — outside flex so position:fixed works reliably */}
        <MobileNav />
      </body>
    </html>
  )
}
