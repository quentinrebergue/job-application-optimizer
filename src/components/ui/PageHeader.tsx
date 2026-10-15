interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className={`mb-section flex items-center justify-between gap-inline border-b-2 border-ink pb-stack ${subtitle ? 'items-start' : ''}`}>
      <div className="min-w-0">
        <h1 className="text-title text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-small text-ink-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-inline">{children}</div>}
    </div>
  )
}
