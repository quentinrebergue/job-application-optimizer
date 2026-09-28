'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Briefcase, MessageSquare, Code2, Network } from 'lucide-react'
import { MODULE_CONFIGS } from '@/config'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FileText, Briefcase, MessageSquare, Code2, Network,
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="mobile-nav fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-stretch"
    >
      {MODULE_CONFIGS.map((mod) => {
        const Icon = ICON_MAP[mod.icon]
        const isActive = pathname === mod.href || pathname.startsWith(mod.href + '/')
        return (
          <Link
            key={mod.id}
            href={mod.href}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-14',
              'text-[9px] font-medium transition-colors leading-tight text-center',
              isActive ? 'text-blue-600' : 'text-slate-400',
            ].join(' ')}
          >
            {Icon && <Icon size={20} className="shrink-0" />}
            <span>{mod.shortLabel}</span>
          </Link>
        )
      })}
    </nav>
  )
}
