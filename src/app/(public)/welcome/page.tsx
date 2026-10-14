import Link from 'next/link'
import { cn } from '@/lib/cn'
import { Catch } from '@/components/landing/Catch'
import { HeroDemo } from '@/components/landing/HeroDemo'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Promises } from '@/components/landing/Promises'
import { Sources, Why } from '@/components/landing/Why'
import { buttonClasses } from '@/components/ui/Button'
import { focusLink, page, stickerText } from '@/components/ui/styles'

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

const bigButton = 'h-12 px-section text-body'

// What happens to the data. True today (docs/charter.md); the AI ones come from ai-copy.ts (AI_ON_MISTRAL, #192).
const DATA_SENTENCE = 'encrypted in transit, hosted in France, never sold, never used to train a model.'

/**
 * The landing page. A visitor asking for "/" gets this page (src/proxy.ts
 * rewrites it), signed-in users get their home. Charter: docs/charter.md.
 */
export default function WelcomePage() {
  return (
    <div className="overflow-x-clip">
      <section className={`${page} grid items-center gap-columns py-hero md:grid-cols-[minmax(0,1fr)_22rem] lg:grid-cols-2`}>
        <div>
          <p className={cn(stickerText, 'inline-block -rotate-2 rounded-control border-2 border-ink bg-surface px-control py-1 shadow-hard')}>
            Free · Hosted in France
          </p>
          <h1 className="mt-heading text-display">
            <span className="inline-block">One job.</span> <span className="inline-block">One resume.</span>{' '}
            <span className="mt-2 inline-block -rotate-1 rounded-control border-2 border-ink bg-accent px-control shadow-hard">Three clicks.</span>
          </h1>
          <p className="mt-heading max-w-measure text-lead text-ink-muted">
            Import a job offer, let the AI pick what fits best from your library, and download the PDF of a resume tailored to it.
          </p>
          <div className="mt-section">
            <Link href="/signup" className={buttonClasses({ className: bigButton })}>Sign up</Link>
          </div>
          <p className="mb-section mt-section max-w-measure text-small text-ink/65 md:text-body">
            <strong className="font-extrabold text-ink">Your data stays yours:</strong> {DATA_SENTENCE}
          </p>
        </div>
        <HeroDemo />
      </section>

      <Why />

      <HowItWorks />

      {/* From What we stand for to the end: the light beige zone (the line above is the bottom edge of How it works). */}
      <div className="bg-panel">
      <div className={`${page} flex flex-col gap-chapter py-band`}>
        <Promises />

        <Catch />

        <section aria-labelledby="start-title" className="relative">
          <p className={cn(stickerText, 'absolute -top-4 right-6 z-10 -rotate-3 rounded-control border-2 border-ink bg-accent px-control py-1 shadow-hard')}>
            Free
          </p>
          {/* Not like the white card above (the catch): the page tone, centred, big; the red button is its only colour. */}
          <div className="flex flex-col items-center gap-columns rounded-control border-2 border-ink bg-canvas p-showcase text-center shadow-hard">
            <div>
              <h2 id="start-title" className="mx-auto max-w-3xl text-statement">Start with your next application</h2>
              <p className="mx-auto mt-heading max-w-measure text-lead text-ink-muted">
                Fill your library once. After that, every job offer is three clicks away from a tailored resume.
              </p>
            </div>
            <div className="flex w-full flex-col items-center gap-stack">
              <Link href="/signup" className={buttonClasses({ className: 'h-14 w-full px-section text-lead sm:w-auto' })}>Create your account</Link>
              <Link href="/login" className={cn('inline-flex min-h-10 items-center font-semibold underline underline-offset-4', focusLink)}>
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
