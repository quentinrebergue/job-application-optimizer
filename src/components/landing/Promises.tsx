import { cn } from '@/lib/cn'
import { PROMISES } from './promise-list'

/** The promises as solid, straight cards: the first one in red and large, then two more large, the rest smaller. Two columns on phones. */
export function Promises() {
  return (
    <section aria-labelledby="promises-title">
      <h2 id="promises-title" className="text-statement">What we stand for</h2>
      <p className="mt-heading max-w-measure text-lead text-ink-muted">What we promise, and what we will never do.</p>
      <ul className="mt-section grid grid-cols-2 gap-stack md:grid-cols-6">
        {PROMISES.map((promise, index) => (
          <li
            key={promise.title}
            className={cn(
              'flex flex-col gap-1 rounded-control border-2 border-ink p-card shadow-hard',
              index === 0 ? 'bg-accent' : 'bg-surface',
              // Phones: the first one across, the others in pairs. From medium screens: two large, then threes.
              index === 0 ? 'col-span-2 md:col-span-3' : index === 1 ? 'md:col-span-3' : 'md:col-span-2',
            )}
          >
            <h3 className={index < 2 ? 'text-title' : 'text-subsection md:text-section'}>{promise.title}</h3>
            <p className={cn('text-small md:text-body', index === 0 ? 'text-ink' : 'text-ink-muted')}>{promise.note}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
