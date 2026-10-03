interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b-2 border-ink pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div>}
    </div>
  )
}
