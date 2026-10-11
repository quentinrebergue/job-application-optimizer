import { cn } from '@/lib/cn'
import { page } from '@/components/ui/styles'

const LADDERS_URL = 'https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582'
const HUNTR_URL = 'https://huntr.co/research/best-resume-format'

// The right margin keeps the hard shadow off the full stop that follows.
const sticker = 'mr-1.5 inline-block rounded-control border-2 border-ink bg-accent px-2.5 font-extrabold shadow-hard'

/**
 * A number in a sticker, with a small ink digit that links to its note at the
 * bottom of the page (ink on the red is 5.5:1; white would be 3.3:1, under the
 * 4.5:1 text needs). The link's hit area is wider than the digit.
 */
function Figure({ children, note, tilt }: { children: React.ReactNode; note: number; tilt: string }) {
  return (
    <span className={cn(sticker, tilt)}>
      {children}
      <a
        href={`#why-source-${note}`}
        aria-label={`Source ${note}`}
        className="relative -top-2 ml-1 inline-block px-0.5 text-sm font-extrabold leading-none text-ink underline underline-offset-2 after:absolute after:-inset-2 focus-visible:bg-warning focus-visible:outline-2 focus-visible:outline-transparent"
      >
        {note}
      </a>
    </span>
  )
}

/**
 * Why use it, as one sentence with its two figures as stickers. The notes
 * are at the bottom of the page (Sources), read at the source on 2026-10-08.
 */
export function Why() {
  return (
    <section aria-labelledby="why-title" className="border-t-2 border-ink bg-panel">
      <div className={cn(page, 'py-12 md:py-16')}>
        <h2 id="why-title" className="text-4xl font-extrabold tracking-tight sm:text-5xl">Why FastResume?</h2>
        <p className="mt-6 max-w-4xl text-xl font-normal leading-[1.9] tracking-tight sm:text-2xl sm:leading-[1.8] md:text-3xl md:leading-[1.7]">
          A recruiter&apos;s first look at a resume lasts <Figure note={1} tilt="-rotate-2">7.4 s</Figure>. Tailored applications convert{' '}
          <Figure note={2} tilt="rotate-1">56% better</Figure>. FastResume makes a tailored resume for every offer in three clicks, and keeps track of your job offers.
        </p>
      </div>
    </section>
  )
}

/**
 * The notes behind the figures of Why: what each measures, who published it,
 * what to keep in mind. "56%" is computed from Huntr's two published rates
 * (5.8 / 3.73 = 1.56), next to its own "about 1.6 times".
 */
export function Sources() {
  return (
    <section aria-labelledby="sources-title" className="border-t-2 border-line pt-6">
      <h2 id="sources-title" className="text-sm font-extrabold uppercase tracking-wider text-ink-muted">Sources</h2>
      <ol className="mt-3 flex max-w-4xl list-decimal flex-col gap-2 pl-5 text-sm text-ink-muted marker:font-extrabold">
        <li id="why-source-1" className="scroll-mt-24 pl-1">
          Ladders eye-tracking study, 2018: recruiters&apos; first screening of a resume lasted 7.4 seconds on average.{' '}
          <a href={LADDERS_URL} className="font-semibold text-accent-strong underline underline-offset-4">Report by HR Dive</a>.
        </li>
        <li id="why-source-2" className="scroll-mt-24 pl-1">
          Huntr, 2025 Annual Job Search Trends Report: tailored applications led to an interview, an offer or a hire 5.8% of the time, against 3.73% for the others (&quot;about 1.6 times as high&quot;, or 56% better: 5.8 ÷ 3.73 = 1.56). Data from Huntr&apos;s users.{' '}
          <a href={HUNTR_URL} className="font-semibold text-accent-strong underline underline-offset-4">Read the report</a>.
        </li>
      </ol>
    </section>
  )
}
