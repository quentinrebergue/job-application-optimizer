interface BadgeProps {
  label: string
  variant?: 'blue' | 'purple' | 'green' | 'orange' | 'slate' | 'red'
}

const COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  green: 'bg-emerald-100 text-emerald-700',
  orange: 'bg-orange-100 text-orange-700',
  slate: 'bg-slate-100 text-slate-700',
  red: 'bg-red-100 text-red-700',
}

export function Badge({ label, variant = 'slate' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${COLORS[variant]}`}
    >
      {label}
    </span>
  )
}
