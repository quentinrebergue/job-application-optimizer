import { LEGAL_UPDATED } from '@/config/legal'
import { page } from '@/components/ui/styles'
import { cn } from '@/lib/cn'

/** Frame of a text page (privacy, legal notice, terms): readable width, title, date. */
export function LegalPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <article className={cn(page, 'max-w-3xl py-10 md:py-16')}>
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-ink-muted">Last updated {LEGAL_UPDATED}</p>
      {intro && <p className="mt-6 text-lg">{intro}</p>}
      <div className="mt-8 flex flex-col gap-10">{children}</div>
    </article>
  )
}

/** A titled block of a text page. */
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 [&_a]:font-semibold [&_a]:text-accent-strong [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}
