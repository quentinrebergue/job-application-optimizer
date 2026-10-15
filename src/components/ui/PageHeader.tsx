import { cn } from '@/lib/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /**
   * On a phone the page starts with its content: the title is kept for screen readers only and the buttons of the
   * header are not drawn (the page puts them elsewhere).
   */
  hideOnPhone?: boolean
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, hideOnPhone = false, children }: PageHeaderProps) {
  return (
    <div className={cn('mb-section flex items-center justify-between gap-inline border-b-2 border-ink pb-stack', subtitle && 'items-start', hideOnPhone && 'max-md:contents')}>
      <div className={cn('min-w-0', hideOnPhone && 'max-md:sr-only')}>
        <h1 className="text-title text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-small text-ink-muted">{subtitle}</p>}
      </div>
      {children && <div className={cn('flex shrink-0 flex-wrap items-center gap-inline', hideOnPhone && 'max-md:hidden')}>{children}</div>}
    </div>
  )
}
