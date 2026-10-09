import Link from 'next/link'
import { Catch } from '@/components/landing/Catch'
import { HeroDemo } from '@/components/landing/HeroDemo'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Promises } from '@/components/landing/Promises'
import { Sources, Why } from '@/components/landing/Why'
import { buttonClasses } from '@/components/ui/Button'
import { page } from '@/components/ui/styles'

export const metadata = {
  title: { absolute: 'FastResume · One job. One resume. Three clicks.' },
  description: 'Import a job offer, let the AI pick what fits from your library, download your tailored resume. Free, hosted in France, no tracking.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'FastResume · One job. One resume. Three clicks.',
    description: 'Import a job offer, let the AI pick what fits from your library, download your tailored resume. Free, hosted in France, no tracking.',
    url: '/',
    // Set here because this openGraph replaces the root one, with its image.
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'FastResume: one job, one resume, three clicks' }],
  },
  twitter: { images: ['/opengraph-image'] },
}

const bigButton = 'h-12 px-6 text-base'

// What happens to the data. True today (docs/charter.md); the AI ones come from ai-copy.ts (AI_ON_MISTRAL, #192).
const DATA_SENTENCE = 'encrypted in transit, hosted in France, never sold, never used to train a model.'

/**
 * The landing page. A visitor asking for "/" gets this page (src/proxy.ts
 * rewrites it), signed-in users get their home. Charter: docs/charter.md.
 */
export default function WelcomePage() {
  return (
    <div className="overflow-x-clip">
      <section className={`${page} grid items-center gap-12 pb-10 pt-10 md:grid-cols-[minmax(0,1fr)_22rem] md:gap-8 md:pb-16 md:pt-20 lg:grid-cols-2 lg:gap-12 lg:pb-28 lg:pt-28`}>
        <div>
          <p className="inline-block -rotate-2 rounded-control border-2 border-ink bg-surface px-3 py-1 text-xs font-extrabold uppercase tracking-wider shadow-hard">
            Free · Hosted in France
          </p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl md:text-5xl lg:text-7xl">
            <span className="inline-block">One job.</span> <span className="inline-block">One resume.</span>{' '}
            <span className="mt-2 inline-block -rotate-1 rounded-control border-2 border-ink bg-accent px-3 shadow-hard md:mt-3">Three clicks.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-muted sm:mt-6 sm:text-xl">
            Import a job offer, let the AI pick what fits best from your library, and download the PDF of a resume tailored to it.
          </p>
          <div className="mt-8">
            <Link href="/signup" className={buttonClasses({ className: bigButton })}>Sign up</Link>
          </div>
          <p className="mb-6 mt-6 max-w-xl text-sm text-ink/65 md:text-base">
            <strong className="font-extrabold text-ink">Your data stays yours:</strong> {DATA_SENTENCE}
          </p>
        </div>
        <HeroDemo />
      </section>

      <Why />

      <HowItWorks />

      {/* From What we stand for to the end: the light beige zone (the line above is the bottom edge of How it works). */}
      <div className="bg-panel">
      <div className={`${page} flex flex-col gap-16 pb-10 pt-12 md:gap-24 md:pb-12 md:pt-20`}>
        <Promises />

        <Catch />

        <section aria-labelledby="start-title" className="relative">
          <p className="absolute -top-4 right-6 z-10 -rotate-3 rounded-control border-2 border-ink bg-accent px-3 py-1 text-xs font-extrabold uppercase tracking-wider shadow-hard">
            Free
          </p>
          {/* Not like the white card above (the catch): the page tone, centred, big; the red button is its only colour. */}
          <div className="flex flex-col items-center gap-8 rounded-control border-2 border-ink bg-canvas p-8 text-center shadow-hard md:p-16">
            <div>
              <h2 id="start-title" className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">Start with your next application</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-ink-muted">
                Fill your library once. After that, every job offer is three clicks away from a tailored resume.
              </p>
            </div>
            <div className="flex w-full flex-col items-center gap-4">
              <Link href="/signup" className={buttonClasses({ className: 'h-14 w-full px-10 text-lg sm:w-auto' })}>Create your account</Link>
              <Link href="/login" className="inline-flex min-h-10 items-center font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-strong">
                I already have an account
              </Link>
            </div>
          </div>
        </section>

        <Sources />
      </div>
      </div>
    </div>
  )
}
