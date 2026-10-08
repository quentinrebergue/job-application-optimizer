import { cn } from '@/lib/cn'
import { eyebrow, stroke } from '@/components/ui/styles'

// The entries the AI picked in the demo (HeroDemo RESULTS), as they read in the resume.
const EXPERIENCE = {
  role: 'Backend engineer',
  where: 'Atelier Pixel',
  when: '2021 – now',
  points: ['Cut the API latency by 75%, from 900 ms to 220 ms.', 'Moved billing to an event queue; no lost invoice in 14 months.'],
}
const PROJECT = { name: 'Booking service in Go', text: 'Used by 40 studios, built with Go and PostgreSQL.' }
const EDUCATION = { name: 'MSc Computer Science', where: 'Université de Lyon', when: '2018' }

/**
 * An example of the result, drawn in HTML: a made-up person, a sober classic
 * layout like the generated PDF. Hidden from screen readers, the caption says it.
 */
export function ResumeExample({ className, paperClassName, showCaption = true }: { className?: string; paperClassName?: string; showCaption?: boolean }) {
  return (
    <figure className={cn('mx-auto w-full max-w-md', className)}>
      <div aria-hidden="true" className={cn(stroke, 'bg-surface p-5 text-[11px] leading-snug shadow-hard sm:p-6 sm:text-xs', paperClassName)}>
        <p className="text-lg font-extrabold tracking-tight sm:text-xl">Alex Martin</p>
        <p className="font-semibold">Backend engineer</p>
        <p className="text-ink-muted">alex@example.com · Lyon, France</p>

        <p className={cn(eyebrow, 'mt-4 border-b border-ink pb-1')}>Profile</p>
        <p className="mt-1.5">Seven years building reliable APIs for logistics and booking.</p>

        <p className={cn(eyebrow, 'mt-4 border-b border-ink pb-1')}>Experience</p>
        <div className="mt-2">
          <p className="flex justify-between gap-2 font-semibold">
            <span>{EXPERIENCE.role}, {EXPERIENCE.where}</span>
            <span className="shrink-0 tabular-nums text-ink-muted">{EXPERIENCE.when}</span>
          </p>
          <ul className="mt-0.5 list-disc pl-4">
            {EXPERIENCE.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </div>

        <p className={cn(eyebrow, 'mt-4 border-b border-ink pb-1')}>Projects</p>
        <p className="mt-2"><span className="font-semibold">{PROJECT.name}.</span> {PROJECT.text}</p>

        <p className={cn(eyebrow, 'mt-4 border-b border-ink pb-1')}>Education</p>
        <p className="mt-2 flex justify-between gap-2 font-semibold">
          <span>{EDUCATION.name}, {EDUCATION.where}</span>
          <span className="shrink-0 tabular-nums text-ink-muted">{EDUCATION.when}</span>
        </p>
      </div>
      {showCaption && (
        <figcaption className="mt-3 text-sm text-ink-muted">
          Example of a generated resume, for a made-up person. The PDF keeps this sober layout.
        </figcaption>
      )}
    </figure>
  )
}
