'use client'

import { useState } from 'react'
import { MarkdownContent } from '@/components/ui/MarkdownContent'
import type { KnowledgeItem } from '@/types'

interface Props {
  item: KnowledgeItem
}

export function KnowledgeCard({ item }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900">{item.name}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {item.category}
          </span>
        </div>
        <span className="text-slate-400 text-base font-bold">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
          <MarkdownContent>{item.explanation}</MarkdownContent>
        </div>
      )}
    </div>
  )
}
