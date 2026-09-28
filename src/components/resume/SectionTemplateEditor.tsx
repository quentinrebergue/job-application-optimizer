'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Save, RotateCcw } from 'lucide-react'
import type { EntitySectionType } from '@/config'

type TabId = 'section' | 'entity'

interface TabState {
  content: string
  initial: string
  saving: boolean
  saved: boolean
}

interface Props {
  type: EntitySectionType
  label: string
  sectionContent: string
  entityContent: string
  entityFields: string[]
}

export function SectionTemplateEditor({ type, label, sectionContent, entityContent, entityFields }: Props) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('section')
  const [tabs, setTabs] = useState<Record<TabId, TabState>>({
    section: { content: sectionContent, initial: sectionContent, saving: false, saved: false },
    entity: { content: entityContent, initial: entityContent, saving: false, saved: false },
  })

  function updateTab(id: TabId, patch: Partial<TabState>) {
    setTabs((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const current = tabs[activeTab]
  const isDirty = current.content !== current.initial

  const apiUrl = {
    section: `/api/resume/sections/${type}`,
    entity: `/api/resume/entity-templates/${type}`,
  }[activeTab]

  async function handleSave() {
    updateTab(activeTab, { saving: true })
    try {
      await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: current.content }),
      })
      updateTab(activeTab, { initial: current.content, saved: true })
      setTimeout(() => updateTab(activeTab, { saved: false }), 2000)
    } finally {
      updateTab(activeTab, { saving: false })
    }
  }

  const tabDefs: { id: TabId; label: string; hint: string }[] = [
    {
      id: 'section',
      label: 'Section wrapper',
      hint: '%%ITEMS%% is replaced by all rendered entity snippets for this section.',
    },
    {
      id: 'entity',
      label: 'Entity template',
      hint: `Each entity is rendered with this template. Available fields: ${entityFields.join(', ')}`,
    },
  ]

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Accordion header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          <span className="text-sm font-medium text-slate-800">{label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {(tabs.section.content !== tabs.section.initial || tabs.entity.content !== tabs.entity.initial) && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
          )}
          <span>{open ? 'collapse' : 'edit'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {tabDefs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={[
                  'px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
                  activeTab === t.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800',
                ].join(' ')}
              >
                {t.label}
                {tabs[t.id].content !== tabs[t.id].initial && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />
                )}
              </button>
            ))}
          </div>

          {/* Hint */}
          <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500">
            {tabDefs.find((t) => t.id === activeTab)!.hint.split(/(`[^`]+`)/).map((part, i) =>
              part.startsWith('`') ? (
                <code key={i} className="font-mono bg-slate-200 text-slate-700 px-1 rounded">
                  {part.slice(1, -1)}
                </code>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </div>

          {/* Textarea */}
          <textarea
            key={activeTab}
            value={current.content}
            onChange={(e) => updateTab(activeTab, { content: e.target.value })}
            className="w-full font-mono text-xs bg-slate-900 text-slate-100 p-4 min-h-28 resize-y outline-none"
            spellCheck={false}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-slate-100">
            {isDirty && (
              <button
                onClick={() => updateTab(activeTab, { content: current.initial })}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={current.saving || !isDirty}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={12} />
              {current.saving ? 'Saving…' : current.saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
