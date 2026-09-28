import Link from 'next/link'
import { FileText, Briefcase, MessageSquare, Code2 } from 'lucide-react'
import { MODULE_CONFIGS } from '@/config'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FileText,
  Briefcase,
  MessageSquare,
  Code2,
}

const COLOR_MAP: Record<string, { icon: string }> = {
  blue:    { icon: 'text-blue-600 bg-blue-50' },
  purple:  { icon: 'text-purple-600 bg-purple-50' },
  emerald: { icon: 'text-emerald-600 bg-emerald-50' },
  orange:  { icon: 'text-orange-500 bg-orange-50' },
}

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Dashboard</h1>
        <p className="text-slate-500">Your all-in-one graduate job preparation hub.</p>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULE_CONFIGS.map((mod) => {
          const Icon = ICON_MAP[mod.icon]
          const colors = COLOR_MAP[mod.color] ?? COLOR_MAP['blue']
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="group block rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`rounded-xl p-2.5 shrink-0 ${colors.icon}`}>
                  {Icon && <Icon size={20} />}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {mod.label}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">{mod.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
