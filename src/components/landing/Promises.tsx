import { cn } from '@/lib/cn'
import { PROMISES } from './promise-list'

/** The promises as solid, straight cards: the first one in red and large, then two more large, the rest smaller. Two columns on phones. */
export function Promises() {
  return (
    <section aria-labelledby="promises-title">
      <h2 id="promises-title" className="text-4xl font-extrabold tracking-tight sm:text-5xl">What we stand for</h2>
      <p className="mt-3 max-w-2xl text-lg text-ink-muted">What we promise, and what we will never do.</p>
      <ul className="mt-8 grid grid-cols-2 gap-4 md:mt-10 md:grid-cols-6 md:gap-6">
        {PROMISES.map((promise, index) => (
          <li
            key={promise.title}
            className={cn(
              'flex flex-col gap-1 rounded-control border-2 border-ink p-4 shadow-hard md:p-5',
              index === 0 ? 'bg-accent' : 'bg-surface',
              // Phones: the first one across, the others in pairs. From medium screens: two large, then threes.
              index === 0 ? 'col-span-2 md:col-span-3' : index === 1 ? 'md:col-span-3' : 'md:col-span-2',
            )}
          >
            <h3 className={cn('font-extrabold tracking-tight', index === 0 ? 'text-2xl md:text-3xl' : index === 1 ? 'text-lg md:text-3xl' : 'text-lg md:text-xl')}>{promise.title}</h3>
            <p className={cn('text-sm md:text-base', index === 0 ? 'text-ink' : 'text-ink-muted')}>{promise.note}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
