import { LEGAL_UPDATED } from '@/config/legal'
import { page } from '@/components/ui/styles'
import { cn } from '@/lib/cn'

/** Frame of a text page (privacy, legal notice, terms): readable width, title, date. */
export function LegalPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <article className={cn(page, 'max-w-3xl py-band')}>
      <h1 className="text-statement">{title}</h1>
      <p className="mt-heading text-small text-ink-muted">Last updated {LEGAL_UPDATED}</p>
      {intro && <p className="mt-section text-lead">{intro}</p>}
      <div className="mt-section flex flex-col gap-section">{children}</div>
    </article>
  )
}

/** A titled block of a text page. */
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-inline [&_a]:font-semibold [&_a]:text-accent-strong [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:pl-indent [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
      <h2 className="text-heading">{title}</h2>
      {children}
    </section>
  )
}
