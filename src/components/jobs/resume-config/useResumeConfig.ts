'use client'

import { useEffect, useRef, useState } from 'react'
import type { EntityMeta, ResumeConfig, SkillMeta } from '@/types'
import type { AIAnalysisResult, SuggestedSkill } from '@/types/job'
import { fetchJson } from '@/lib/http'
import { EMPTY_CONFIG, initialConfig, resetConfig } from './logic'

export type TextField = 'resume_title' | 'profile_text' | 'ai_context'
type Defaults = Record<TextField, string>

const TEXT_SAVE_DELAY_MS = 800
const NO_DEFAULTS: Defaults = { resume_title: '', profile_text: '', ai_context: '' }

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.'
}

/**
 * State of the "Resume for this job" panel: the library, the job's resume
 * config, the text fields, and every way to change them.
 *
 * Saving rules:
 * - Opening the panel never writes: AI recommendations and defaults are shown,
 *   and saved with the user's next change.
 * - Every change is applied to the latest config (kept in a ref), so a delayed
 *   text save cannot overwrite a selection made in the meantime.
 */
export function useResumeConfig(jobId: string, aiAnalysis?: AIAnalysisResult | null) {
  const [entities, setEntities] = useState<EntityMeta[]>([])
  const [config, setConfig] = useState<ResumeConfig>(EMPTY_CONFIG)
  const configRef = useRef<ResumeConfig>(EMPTY_CONFIG)
  const [defaults, setDefaults] = useState<Defaults>(NO_DEFAULTS)
  const [drafts, setDrafts] = useState<Defaults>(NO_DEFAULTS)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [pendingSaves, setPendingSaves] = useState(0)
  const [pendingText, setPendingText] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textTimers = useRef<Partial<Record<TextField, ReturnType<typeof setTimeout>>>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchJson<EntityMeta[]>('/api/entities'),
      fetchJson<ResumeConfig | null>(`/api/jobs/${jobId}/resume-config`),
      fetchJson<Defaults>('/api/resume/defaults'),
    ])
      .then(([ents, saved, defs]) => {
        if (cancelled) return
        const cfg = initialConfig(saved, ents, aiAnalysis)
        configRef.current = cfg
        setEntities(ents)
        setConfig(cfg)
        setDefaults(defs)
        setDrafts({
          resume_title: cfg.resume_title || defs.resume_title || '',
          profile_text: cfg.profile_text || defs.profile_text || '',
          ai_context: cfg.ai_context || defs.ai_context || '',
        })
      })
      .catch((err) => { if (!cancelled) setError(`Resume settings not loaded: ${message(err)}`) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // Reload when a new AI analysis arrives (its job_id goes from absent to set).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, aiAnalysis?.job_id])

  useEffect(() => {
    const timers = textTimers.current
    return () => { for (const t of Object.values(timers)) clearTimeout(t) }
  }, [])

  async function save(next: ResumeConfig) {
    setPendingSaves((n) => n + 1)
    try {
      await fetchJson(`/api/jobs/${jobId}/resume-config`, { method: 'PUT', json: next })
    } catch (err) {
      setError(`Changes not saved: ${message(err)}`)
    } finally {
      setPendingSaves((n) => n - 1)
    }
  }

  /** Applies a change to the latest config, shows it, and saves it. */
  function update(change: (current: ResumeConfig) => ResumeConfig) {
    const next = change(configRef.current)
    if (next === configRef.current) return
    configRef.current = next
    setConfig(next)
    setError(null)
    void save(next)
  }

  /** Text fields save after the user stops typing. */
  function editText(field: TextField, value: string) {
    setDrafts((d) => ({ ...d, [field]: value }))
    const existing = textTimers.current[field]
    if (existing) clearTimeout(existing)
    else setPendingText((n) => n + 1)
    textTimers.current[field] = setTimeout(() => {
      delete textTimers.current[field]
      setPendingText((n) => n - 1)
      update((c) => ({ ...c, [field]: value }))
    }, TEXT_SAVE_DELAY_MS)
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** Runs a library change, reporting failures; `key` marks what is busy. */
  async function libraryChange(key: string, run: () => Promise<void>) {
    setBusy(key)
    setError(null)
    try {
      await run()
    } catch (err) {
      setError(`Library not updated: ${message(err)}`)
    } finally {
      setBusy(null)
    }
  }

  function replaceEntity(updated: EntityMeta) {
    setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  /** Creates a skill the AI suggested and selects it. */
  const addSuggestedSkill = (s: SuggestedSkill) => libraryChange(s.name, async () => {
    const created = await fetchJson<EntityMeta>('/api/entities', {
      method: 'POST',
      json: { type: 'skills', name: s.name, category: s.category, level: s.level || 'intermediate', tags: s.tags },
    })
    setEntities((prev) => [...prev, created])
    update((c) => ({ ...c, selected_entity_ids: [...c.selected_entity_ids, created.id] }))
  })

  /** Adds a tag to a skill in the library; `select` also includes it in this resume. */
  const addTag = (skill: SkillMeta, tag: string, select: boolean) => libraryChange(`${skill.id}:${tag}`, async () => {
    const trimmed = tag.trim()
    if (!trimmed || skill.tags.includes(trimmed)) return
    const updated = await fetchJson<EntityMeta>(`/api/entities/skills/${skill.id}`, { method: 'PUT', json: { tags: [...skill.tags, trimmed] } })
    replaceEntity(updated)
    if (select) {
      update((c) => {
        const current = c.skill_tag_overrides?.[skill.id] ?? skill.tags
        return { ...c, skill_tag_overrides: { ...(c.skill_tag_overrides ?? {}), [skill.id]: [...current, trimmed] } }
      })
    }
  })

  /** Back to the defaults: education selected, texts from the global defaults (not saved until edited). */
  function reset() {
    for (const t of Object.values(textTimers.current)) clearTimeout(t)
    textTimers.current = {}
    setPendingText(0)
    update(() => resetConfig(entities))
    setDrafts({ ...defaults })
    setExpanded(new Set())
  }

  return {
    entities, config, defaults, drafts, expanded, loading, error, busy,
    saving: pendingSaves > 0 || pendingText > 0,
    update, editText, toggleExpanded, addSuggestedSkill, addTag, reset,
    clearError: () => setError(null),
  }
}
