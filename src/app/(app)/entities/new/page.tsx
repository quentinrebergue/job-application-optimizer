'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntityForm } from '@/components/entities/EntityForm'
import type { EntityType, ExperienceMeta, ProjectMeta, SkillMeta, EducationMeta } from '@/types'

const TYPE_OPTIONS: { value: EntityType; label: string; description: string }[] = [
  { value: 'experiences', label: 'Experience', description: 'A job, internship, or role' },
  { value: 'projects', label: 'Project', description: 'A personal or professional project' },
  { value: 'skills', label: 'Skill', description: 'A technical or soft skill' },
  { value: 'education', label: 'Education', description: 'A degree or academic qualification' },
]

export default function NewEntityPage() {
  const router = useRouter()
  const [type, setType] = useState<EntityType | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave(data: Omit<ExperienceMeta | ProjectMeta | SkillMeta | EducationMeta, 'id' | 'type'>) {
    if (!type) return
    setSaving(true)
    const res = await fetch('/api/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...data }),
    })
    setSaving(false)
    if (res.ok) {
      const entity = await res.json()
      router.push(`/entities/${entity.type}/${entity.id}`)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <PageHeader
        title="New Entity"
        subtitle="Add a new resume block to your library."
      />

      {/* Step 1: pick type */}
      {!type ? (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Choose entity type</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className="text-left rounded-xl border-2 border-slate-200 bg-white p-4 hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <span className="block font-semibold text-slate-900 mb-0.5">{opt.label}</span>
                <span className="text-sm text-slate-500">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Step 2: fill form */
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm font-medium text-slate-700">Type:</span>
            <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700 capitalize">
              {type}
            </span>
            <button
              onClick={() => setType(null)}
              className="ml-1 text-xs text-slate-400 hover:text-slate-600 underline"
            >
              change
            </button>
          </div>
          <EntityForm
            type={type}
            saving={saving}
            onSave={handleSave}
            onCancel={() => router.back()}
          />
        </div>
      )}
    </div>
  )
}
