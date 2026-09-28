'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Briefcase, MessageSquare, Code2, GraduationCap, Network } from 'lucide-react'
import { MODULE_CONFIGS } from '@/config'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FileText, Briefcase, MessageSquare, Code2, Network,
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="desktop-sidebar w-60 shrink-0 min-h-screen bg-white border-r border-slate-200 flex-col">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
          <GraduationCap size={17} className="text-white" />
        </div>
        <span className="font-semibold text-sm text-slate-900 leading-tight tracking-tight">
          Job Optimizer
        </span>
      </div>

      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
        {MODULE_CONFIGS.map((mod) => {
          const Icon = ICON_MAP[mod.icon]
          const isActive = pathname === mod.href || pathname.startsWith(mod.href + '/')
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={[
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              ].join(' ')}
            >
              {Icon && <Icon size={16} className={`shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />}
              {mod.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-slate-100">
        <p className="text-xs text-slate-400">v0.1.0</p>
      </div>
    </aside>
  )
}
