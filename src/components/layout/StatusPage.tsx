import { page } from '@/components/ui/styles'
import { cn } from '@/lib/cn'

/** A short message in a sticker with what to do next: the look of "not found" and "something went wrong". */
export function StatusPage({
  code,
  title,
  children,
  actions,
}: {
  /** The big mark above the title ("404", "Oops") */
  code: string
  title: string
  children: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <div className={cn(page, 'flex flex-col items-start gap-4 py-12 md:py-20')}>
      <p className="rounded-control border-2 border-ink bg-warning px-3 py-1 text-sm font-extrabold shadow-hard">{code}</p>
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="max-w-prose text-ink-muted">{children}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">{actions}</div>
    </div>
  )
}
