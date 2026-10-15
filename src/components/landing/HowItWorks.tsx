import { cn } from '@/lib/cn'
import { APPLICATION_STATUSES, APPLICATION_STATUS_BADGES, APPLICATION_STATUS_LABELS } from '@/config'
import { Badge } from '@/components/ui/Badge'
import { InfoTip } from '@/components/ui/InfoTip'
import { page } from '@/components/ui/styles'
import { aiStatement } from './ai-copy'
import { JobsDemo } from './JobsDemo'
import { LibraryDemo } from './LibraryDemo'
import { ResumeDemo } from './ResumeDemo'

interface StepProps {
  number: number
  title: string
  children: React.ReactNode
  visual: React.ReactNode
  /** Put the picture first on wide screens */
  flip?: boolean
  /** A line above the step: every step but the first */
  divider?: boolean
}

function Step({ number, title, children, visual, flip, divider }: StepProps) {
  return (
    <div className={cn('grid items-start gap-columns md:grid-cols-2', divider && 'border-t-2 border-ink/15 pt-chapter')}>
      <div className={cn('flex flex-col gap-stack', flip && 'md:order-2')}>
        <div className="flex items-center gap-inline">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control border-2 border-ink bg-accent text-section tabular-nums shadow-hard">{number}</span>
          <h3 className="text-title">{title}</h3>
        </div>
        {children}
      </div>
      <div className={cn(flip && 'md:order-1')}>{visual}</div>
    </div>
  )
}

/** Rows of a name and a line, under a step's text. */
function Facts({ items, className }: { items: { name: string; text: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn('mt-2 flex flex-col border-t-2 border-ink/15', className)}>
      {items.map((item) => (
        <div key={item.name} className="grid grid-cols-[7.5rem_1fr] items-baseline gap-inline border-b-2 border-ink/15 py-bar">
          <dt className="font-extrabold">{item.name}</dt>
          <dd className="text-ink-muted">{item.text}</dd>
        </div>
      ))}
    </dl>
  )
}

/** What the library holds, one line each. */
const LIBRARY_PARTS = [
  { name: 'Experiences', text: 'Your roles, and what you achieved in them.' },
  { name: 'Projects', text: 'With the technologies you used.' },
  { name: 'Skills', text: 'Grouped by category.' },
  { name: 'Education', text: 'Your degrees and schools.' },
]

const bullet = 'flex flex-col gap-inline text-ink-muted [&_strong]:font-extrabold [&_strong]:text-ink'

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="border-y-2 border-ink">
      <div className={cn(page, 'flex flex-col gap-chapter py-band')}>
        <h2 id="how-title" className="text-statement">How it works</h2>

        <Step number={1} title="Your library" visual={<LibraryDemo />}>
          <div className={bullet}>
            <p>Add your <strong>experiences, projects, skills and education</strong> once. Every resume starts from there: nothing to retype.</p>
          </div>
          {/* Only from medium screens: on a phone the step is the text and the demo. */}
          <Facts items={LIBRARY_PARTS} className="hidden md:flex" />
        </Step>

        <Step number={2} title="Your jobs" visual={<JobsDemo />} flip divider>
          <div className={bullet}>
            <p>Paste the <strong>title, company and description</strong> of each offer. All of them live in one list, and the description is what the AI reads to rank your library.</p>
          </div>
          <div className="mt-2 hidden flex-col gap-inline border-t-2 border-ink/15 pt-stack md:flex">
            <p className="font-extrabold">Follow each application</p>
            <ul className="flex flex-wrap gap-2">
              {APPLICATION_STATUSES.map((status) => (
                <li key={status}><Badge label={APPLICATION_STATUS_LABELS[status]} variant={APPLICATION_STATUS_BADGES[status]} className="w-20 justify-center" /></li>
              ))}
            </ul>
          </div>
        </Step>

        <Step number={3} title="Your resume" visual={<ResumeDemo />} divider>
          <div className={bullet}>
            <p>For each offer, FastResume builds the resume from your library.</p>
          </div>
          <Facts
            items={[
              {
                name: 'Rank',
                text: (
                  <>
                    The AI reads the offer, rates every entry of your library, and marks the best ones Recommended.
                    <InfoTip label="About the AI">{aiStatement().join(' ')}</InfoTip>
                  </>
                ),
              },
              { name: 'Tailor', text: 'You have the last word: tick or untick any entry.' },
              { name: 'Download', text: 'Pick a template and get the PDF.' },
            ]}
          />
        </Step>
      </div>
    </section>
  )
}
