'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, FileDown, ChevronDown, ChevronRight, Sparkles, Plus, XCircle, RotateCcw } from 'lucide-react'
import type { EntityMeta, ResumeConfig, SkillMeta } from '@/types'
import type { AIAnalysisResult, SuggestedSkill } from '@/types/job'
import { AIRankButton } from './AIRankButton'

const TYPE_LABELS: Record<string, string> = {
  experiences: 'Work Experience',
  projects: 'School Projects',
  skills: 'Technical Expertise',
  education: 'Education',
}

const TYPE_ORDER = ['experiences', 'projects', 'skills', 'education']

function entityLabel(e: EntityMeta): string {
  if (e.type === 'skills') return e.name
  if (e.type === 'education') return e.degree
  return e.title
}

function entitySubLabel(e: EntityMeta): string {
  if (e.type === 'experiences') return e.company
  if (e.type === 'projects') return e.tech.slice(0, 3).join(', ')
  if (e.type === 'education') return e.institution
  return e.level
}

interface Props {
  jobId: string
  aiAnalysis?: AIAnalysisResult | null
  onRankingComplete?: (result: AIAnalysisResult) => void
  onClearAi?: () => void
  hasAiData?: boolean
}

export function ResumeConfigPanel({ jobId, aiAnalysis, onRankingComplete, onClearAi, hasAiData }: Props) {
  const [entities, setEntities] = useState<EntityMeta[]>([])
  const [config, setConfig] = useState<ResumeConfig>({
    selected_entity_ids: [],
    ai_rankings: [],
    profile_text: '',
    resume_title: '',
    ai_context: '',
    skill_tag_overrides: {},
  })
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [profileDraft, setProfileDraft] = useState('')
  const [titleDraft, setTitleDraft] = useState('')
  const [aiContextDraft, setAiContextDraft] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set())
  const [descriptionDrafts, setDescriptionDrafts] = useState<Record<string, string>>({})
  const [globalDefaults, setGlobalDefaults] = useState({ resume_title: '', profile_text: '', ai_context: '' })
  const [addingEntity, setAddingEntity] = useState<string | null>(null)
  const [tagAddEntityId, setTagAddEntityId] = useState<string | null>(null)
  const [tagAddQuery, setTagAddQuery] = useState('')
  const [savingTag, setSavingTag] = useState<string | null>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const aiContextTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-save profile text with debounce
  useEffect(() => {
    if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current)
    if (profileDraft === config.profile_text) return // No change
    // Debounced auto-save timer kickoff — not a render-loop risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavingProfile(true)
    profileTimeoutRef.current = setTimeout(async () => {
      await persistConfig({ ...config, profile_text: profileDraft })
      setSavingProfile(false)
    }, 800)
    return () => {
      if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current)
    }
  }, [profileDraft])

  // Auto-save title with debounce
  useEffect(() => {
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
    if (titleDraft === config.resume_title) return // No change
    // Debounced auto-save timer kickoff — not a render-loop risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavingProfile(true)
    titleTimeoutRef.current = setTimeout(async () => {
      await persistConfig({ ...config, resume_title: titleDraft })
      setSavingProfile(false)
    }, 800)
    return () => {
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
    }
  }, [titleDraft])

  // Auto-save AI context with debounce
  useEffect(() => {
    if (aiContextTimeoutRef.current) clearTimeout(aiContextTimeoutRef.current)
    if (aiContextDraft === config.ai_context) return // No change
    // Debounced auto-save timer kickoff — not a render-loop risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavingProfile(true)
    aiContextTimeoutRef.current = setTimeout(async () => {
      await persistConfig({ ...config, ai_context: aiContextDraft })
      setSavingProfile(false)
    }, 800)
    return () => {
      if (aiContextTimeoutRef.current) clearTimeout(aiContextTimeoutRef.current)
    }
  }, [aiContextDraft])

  useEffect(() => {
    Promise.all([
      fetch('/api/entities').then((r) => r.json()),
      fetch(`/api/jobs/${jobId}/resume-config`).then((r) => r.json()),
      fetch('/api/resume/defaults').then((r) => r.json()),
    ])
      .then(([ents, rawCfg, defaults]: [EntityMeta[], ResumeConfig | null, { resume_title: string; profile_text: string; ai_context: string }]) => {
        setGlobalDefaults(defaults)
        setEntities(ents)

        let cfg: ResumeConfig = rawCfg && rawCfg.selected_entity_ids
          ? rawCfg
          : { selected_entity_ids: [], ai_rankings: [], profile_text: '', resume_title: '', ai_context: '', skill_tag_overrides: {} }

        // Auto-select all education by default when config is fresh (nothing selected yet)
        const educationIds = (ents as EntityMeta[]).filter((e) => e.type === 'education').map((e) => e.id)
        if (cfg.selected_entity_ids.length === 0 && educationIds.length > 0) {
          cfg = { ...cfg, selected_entity_ids: educationIds }
        }

        // Auto-select recommended experiences
        if (aiAnalysis?.recommended_experience_ids?.length) {
          cfg = { ...cfg, selected_entity_ids: Array.from(new Set([...cfg.selected_entity_ids, ...aiAnalysis.recommended_experience_ids])) }
        }
        // Auto-select recommended projects
        if (aiAnalysis?.recommended_project_ids?.length) {
          cfg = { ...cfg, selected_entity_ids: Array.from(new Set([...cfg.selected_entity_ids, ...aiAnalysis.recommended_project_ids])) }
        }
        // Auto-select recommended skills + apply tag overrides
        if (aiAnalysis?.recommended_skill_ids?.length) {
          cfg = { ...cfg, selected_entity_ids: Array.from(new Set([...cfg.selected_entity_ids, ...aiAnalysis.recommended_skill_ids])) }
        }
        if (aiAnalysis?.recommended_skill_tags && Object.keys(aiAnalysis.recommended_skill_tags).length > 0) {
          const overrides = { ...(cfg.skill_tag_overrides ?? {}) }
          for (const [skillId, tags] of Object.entries(aiAnalysis.recommended_skill_tags)) {
            const skill = (ents as EntityMeta[]).find((e) => e.id === skillId) as SkillMeta | undefined
            // Only apply AI override if user hasn't already set a custom one
            if (skill && tags.length < skill.tags.length && !overrides[skillId]) {
              overrides[skillId] = tags
            }
          }
          cfg = { ...cfg, skill_tag_overrides: overrides }
        }
        setConfig(cfg)
        
        // Initialize project_order with selected projects if not already set
        if (!cfg.project_order || cfg.project_order.length === 0) {
          const selectedProjects = cfg.selected_entity_ids.filter((id) =>
            ents.some((e) => e.id === id && e.type === 'projects')
          )
          if (selectedProjects.length > 0) {
            cfg = { ...cfg, project_order: selectedProjects }
            setConfig(cfg)
          }
        }

        // Initialize experience_order with selected experiences if not already set
        if (!cfg.experience_order || cfg.experience_order.length === 0) {
          const selectedExperiences = cfg.selected_entity_ids.filter((id) =>
            ents.some((e) => e.id === id && e.type === 'experiences')
          )
          if (selectedExperiences.length > 0) {
            cfg = { ...cfg, experience_order: selectedExperiences }
            setConfig(cfg)
          }
        }

        setProfileDraft(cfg.profile_text || defaults.profile_text || '')
        setTitleDraft(cfg.resume_title || defaults.resume_title || '')
        setAiContextDraft(cfg.ai_context || defaults.ai_context || '')
        // Auto-open entity cards that have an AI description suggestion
        if (aiAnalysis?.recommended_entity_descriptions) {
          setExpandedEntities(new Set(Object.keys(aiAnalysis.recommended_entity_descriptions)))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [jobId, aiAnalysis?.job_id])

  async function persistConfig(updated: ResumeConfig) {
    setConfig(updated)
    setSavingConfig(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/resume-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) {
        console.error('Failed to save resume config:', res.status, await res.text())
      }
    } catch (error) {
      console.error('Error persisting config:', error)
    } finally {
      setSavingConfig(false)
    }
  }

  function toggleEntity(id: string) {
    const isSelected = config.selected_entity_ids.includes(id)
    const entity = entities.find((e) => e.id === id)
    const isProject = entity?.type === 'projects'
    const isExperience = entity?.type === 'experiences'

    const updated: ResumeConfig = {
      ...config,
      selected_entity_ids: isSelected
        ? config.selected_entity_ids.filter((x) => x !== id)
        : [...config.selected_entity_ids, id],
    }

    // Update project_order when toggling projects
    if (isProject) {
      if (isSelected) {
        // Removing project: remove from project_order
        updated.project_order = (updated.project_order ?? []).filter((p) => p !== id)
      } else {
        // Adding project: append to project_order
        updated.project_order = [...(updated.project_order ?? []), id]
      }
    }

    // Update experience_order when toggling experiences
    if (isExperience) {
      if (isSelected) {
        // Removing experience: remove from experience_order
        updated.experience_order = (updated.experience_order ?? []).filter((x) => x !== id)
      } else {
        // Adding experience: append to experience_order
        updated.experience_order = [...(updated.experience_order ?? []), id]
      }
    }

    persistConfig(updated)
  }

  function toggleSkillTag(skillId: string, tag: string, allTags: string[]) {
    const current = config.skill_tag_overrides?.[skillId] ?? allTags
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    const overrides = { ...(config.skill_tag_overrides ?? {}) }
    // Delete override if result equals the skill's base tags (not just if length matches)
    if (next.sort().join('|') === allTags.sort().join('|')) {
      delete overrides[skillId]
    } else {
      overrides[skillId] = next
    }
    persistConfig({ ...config, skill_tag_overrides: overrides })
  }

  async function addSuggestedSkill(suggestion: SuggestedSkill) {
    setAddingEntity(suggestion.name)
    const res = await fetch('/api/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'skills', name: suggestion.name, category: suggestion.category, level: suggestion.level || 'intermediate', tags: suggestion.tags }),
    })
    if (res.ok) {
      const newEntity: EntityMeta = await res.json()
      setEntities((prev) => [...prev, newEntity])
      persistConfig({ ...config, selected_entity_ids: [...config.selected_entity_ids, newEntity.id] })
    }
    setAddingEntity(null)
  }

  function moveProject(projectId: string, direction: 'up' | 'down') {
    const order = config.project_order ?? []
    const index = order.indexOf(projectId)
    
    if (index === -1) return // Project not in order list
    if (direction === 'up' && index === 0) return // Already at top
    if (direction === 'down' && index === order.length - 1) return // Already at bottom

    const next = [...order]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    ;[next[index], next[targetIdx]] = [next[targetIdx], next[index]]
    
    persistConfig({ ...config, project_order: next })
  }

  function applyAiProjectOrder() {
    // Get all selected projects
    const projects = entities.filter(
      (e) => e.type === 'projects' && config.selected_entity_ids.includes(e.id)
    )
    // Sort by AI score (highest first)
    const sorted = projects
      .map((p) => ({
        id: p.id,
        score: config.ai_rankings.find((r) => r.entity_id === p.id)?.score ?? 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((p) => p.id)

    persistConfig({ ...config, project_order: sorted })
  }

  function moveExperience(experienceId: string, direction: 'up' | 'down') {
    const order = config.experience_order ?? []
    const index = order.indexOf(experienceId)

    if (index === -1) return // Experience not in order list
    if (direction === 'up' && index === 0) return // Already at top
    if (direction === 'down' && index === order.length - 1) return // Already at bottom

    const next = [...order]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    ;[next[index], next[targetIdx]] = [next[targetIdx], next[index]]

    persistConfig({ ...config, experience_order: next })
  }

  function applyAiExperienceOrder() {
    // Get all selected experiences
    const experiences = entities.filter(
      (e) => e.type === 'experiences' && config.selected_entity_ids.includes(e.id)
    )
    // Sort by AI score (highest first)
    const sorted = experiences
      .map((e) => ({
        id: e.id,
        score: config.ai_rankings.find((r) => r.entity_id === e.id)?.score ?? 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((e) => e.id)

    persistConfig({ ...config, experience_order: sorted })
  }

  async function addSuggestedTag(skillId: string, newTag: string, skill: SkillMeta) {
    setAddingEntity(`${skillId}:${newTag}`)
    const newTags = [...skill.tags, newTag]
    const res = await fetch(`/api/entities/skills/${skillId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags }),
    })
    if (res.ok) {
      const updated: EntityMeta = await res.json()
      setEntities((prev) => prev.map((e) => e.id === skillId ? updated : e))
      // Include the new tag in the overrides so it's selected
      const current = config.skill_tag_overrides?.[skillId] ?? skill.tags
      persistConfig({ ...config, skill_tag_overrides: { ...(config.skill_tag_overrides ?? {}), [skillId]: [...current, newTag] } })
    }
    setAddingEntity(null)
  }

  function setDescriptionOverride(entityId: string, value: string, originalDescription: string) {
    const overrides = { ...(config.entity_description_overrides ?? {}) }
    if (value === originalDescription || value.trim() === '') {
      // Reset to original: remove from drafts and overrides
      setDescriptionDrafts((prev) => {
        const next = { ...prev }
        delete next[entityId]
        return next
      })
      delete overrides[entityId]
    } else {
      // Save override: update drafts and overrides
      setDescriptionDrafts((prev) => ({ ...prev, [entityId]: value }))
      overrides[entityId] = value
    }
    persistConfig({ ...config, entity_description_overrides: overrides })
  }

  function toggleExpanded(id: string) {
    setExpandedEntities((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function addTagToLibrary(entityId: string, tag: string) {
    const trimmed = tag.trim()
    if (!trimmed) return
    const entity = entities.find((e) => e.id === entityId) as SkillMeta
    if (!entity || entity.tags.includes(trimmed)) return
    setSavingTag(entityId)
    const newTags = [...entity.tags, trimmed]
    await fetch(`/api/entities/skills/${entityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags }),
    })
    setEntities((prev) => prev.map((e) => e.id === entityId ? { ...e, tags: newTags } : e))
    setTagAddEntityId(null)
    setTagAddQuery('')
    setSavingTag(null)
  }

  async function resetToDefaults() {
    const educationIds = entities.filter((e) => e.type === 'education').map((e) => e.id)
    const blank: ResumeConfig = {
      selected_entity_ids: educationIds,
      ai_rankings: [],
      profile_text: '',
      resume_title: '',
      ai_context: '',
      skill_tag_overrides: {},
      entity_description_overrides: {},
    }
    await persistConfig(blank)
    setTitleDraft(globalDefaults.resume_title || '')
    setProfileDraft(globalDefaults.profile_text || '')
    setAiContextDraft(globalDefaults.ai_context || '')
    setDescriptionDrafts({})
    setExpandedEntities(new Set())
  }

  async function generatePdf() {
    setGenerating(true)
    setGenError(null)
    const entityIds = config.selected_entity_ids.length > 0
      ? config.selected_entity_ids
      : entities.map((e) => e.id)
    const res = await fetch('/api/resume/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        entityIds,
        skillTagOverrides: config.skill_tag_overrides,
      }),
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `resume-${jobId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const json = await res.json().catch(() => ({}))
      setGenError(json.error ?? 'Generation failed. Is pdflatex installed?')
    }
    setGenerating(false)
  }

  if (loading) return <div className="text-sm text-slate-400">Loading resume config…</div>

  // Helper to parse period string and extract end date for sorting
  const parseEndDate = (period: string): Date => {
    // Period formats:
    // - "02/2026 – 08/2026" (MM/YYYY - MM/YYYY)
    // - "June 2024 – August 2024" (Month YYYY – Month YYYY)
    // - "2020 – 2026" (YYYY – YYYY)
    // - "Present" or "Present day"
    
    const parts = period.split(/–|—/).map(p => p.trim()) // Split by dash or em-dash
    const endPart = parts[parts.length - 1] // Get last part (end date)
    
    // Handle "Present" or "Present day"
    if (endPart.toLowerCase().includes('present')) {
      return new Date(9999, 11, 31) // Return very future date so Present sorts first (most recent)
    }
    
    let year = 2000
    let month = 0
    
    // Try to parse MM/YYYY format (e.g., "08/2026")
    const mmyyyyMatch = endPart.match(/(\d{1,2})\/(\d{4})/)
    if (mmyyyyMatch) {
      month = parseInt(mmyyyyMatch[1]) - 1 // Convert to 0-based month
      year = parseInt(mmyyyyMatch[2])
      return new Date(year, month, 1)
    }
    
    // Try to parse month name and year (e.g., "August 2024")
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December',
                        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const parts2 = endPart.trim().split(/\s+/)
    for (const part of parts2) {
      const yearMatch = part.match(/\d{4}/)
      if (yearMatch) {
        year = parseInt(yearMatch[0])
      }
      
      const monthIdx = monthNames.findIndex(m => m.toLowerCase() === part.toLowerCase())
      if (monthIdx !== -1) {
        month = monthIdx % 12 // Handle both full and abbreviated month names
      }
    }
    
    return new Date(year, month, 1)
  }

  const selectedCount = config.selected_entity_ids.length
  const hasRankings = config.ai_rankings.length > 0

  const byType = TYPE_ORDER.reduce<Record<string, EntityMeta[]>>((acc, t) => {
    const group = entities.filter((e) => e.type === t)
    
    if (t === 'education') {
      // Sort by end date, most recent first
      group.sort((a, b) => {
        const periodA = (a as { period?: string }).period ?? ''
        const periodB = (b as { period?: string }).period ?? ''
        return parseEndDate(periodB).getTime() - parseEndDate(periodA).getTime()
      })
    } else if (t === 'experiences') {
      // Sort by custom experience_order if available, otherwise by end date (most recent first)
      const byDate = (a: EntityMeta, b: EntityMeta) => {
        const periodA = (a as { period?: string }).period ?? ''
        const periodB = (b as { period?: string }).period ?? ''
        return parseEndDate(periodB).getTime() - parseEndDate(periodA).getTime()
      }
      if (config.experience_order && config.experience_order.length > 0) {
        const orderMap = new Map(config.experience_order.map((id, idx) => [id, idx]))
        group.sort((a, b) => {
          const idxA = orderMap.get(a.id) ?? Infinity
          const idxB = orderMap.get(b.id) ?? Infinity
          if (idxA === Infinity || idxB === Infinity) return byDate(a, b)
          return idxA - idxB
        })
      } else {
        group.sort(byDate)
      }
    } else if (t === 'projects') {
      // Sort by custom project_order if available, otherwise by AI score
      if (config.project_order && config.project_order.length > 0) {
        // Create a map of project ID to order index
        const orderMap = new Map(config.project_order.map((id, idx) => [id, idx]))
        group.sort((a, b) => {
          const idxA = orderMap.get(a.id) ?? Infinity
          const idxB = orderMap.get(b.id) ?? Infinity
          if (idxA === Infinity || idxB === Infinity) {
            // For projects not in order list, sort by AI score
            const sa = aiAnalysis?.entities_by_type.projects.find((p) => p.id === a.id)?.score
              ?? config.ai_rankings.find((r) => r.entity_id === a.id)?.score ?? -1
            const sb = aiAnalysis?.entities_by_type.projects.find((p) => p.id === b.id)?.score
              ?? config.ai_rankings.find((r) => r.entity_id === b.id)?.score ?? -1
            return sb - sa
          }
          return idxA - idxB
        })
      } else {
        // Sort by AI score: prefer live aiAnalysis scores, fall back to saved ai_rankings
        group.sort((a, b) => {
          const sa = aiAnalysis?.entities_by_type.projects.find((p) => p.id === a.id)?.score
            ?? config.ai_rankings.find((r) => r.entity_id === a.id)?.score ?? -1
          const sb = aiAnalysis?.entities_by_type.projects.find((p) => p.id === b.id)?.score
            ?? config.ai_rankings.find((r) => r.entity_id === b.id)?.score ?? -1
          return sb - sa
        })
      }
    } else if (hasRankings) {
      // Skills: sort by AI score if rankings exist
      group.sort((a, b) => {
        const sa = config.ai_rankings.find((r) => r.entity_id === a.id)?.score ?? -1
        const sb = config.ai_rankings.find((r) => r.entity_id === b.id)?.score ?? -1
        return sb - sa
      })
    }
    acc[t] = group
    return acc
  }, {})

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            {selectedCount === 0
              ? 'All entities will be included'
              : `${selectedCount} of ${entities.length} selected`}
          </span>
          {savingConfig && <span className="text-xs text-slate-400 italic">Saving…</span>}
        </div>
        <div className="flex items-center gap-2">
          {onRankingComplete && (
            <AIRankButton
              jobId={jobId}
              onRankingComplete={onRankingComplete}
              compact
            />
          )}
          {hasAiData && onClearAi && (
            <button
              onClick={onClearAi}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
            >
              <XCircle size={14} />
              Clear AI
            </button>
          )}
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 transition-colors"
            title="Reset all selections and text to defaults"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            onClick={generatePdf}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {generating ? 'Generating…' : 'Generate PDF'}
          </button>
        </div>
      </div>

      {genError && (
        <div className="mb-3 rounded-lg px-4 py-2 text-sm bg-red-50 text-red-700 border border-red-200">
          {genError}
        </div>
      )}

      {/* Resume fields */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Resume content</span>
          {savingProfile && <span className="text-xs text-slate-500 italic">Saving…</span>}
        </div>

        {/* Title */}
        <div>
          <label className="flex items-center justify-between text-sm font-medium text-slate-600 mb-1">
            <span>Resume title <span className="text-slate-400 font-normal text-xs">(rendered in LaTeX header)</span></span>
            <button
              type="button"
              onClick={() => setTitleDraft(globalDefaults.resume_title)}
              title="Reset to global default"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            ><RotateCcw className="w-3 h-3" /></button>
          </label>
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            placeholder="e.g. Software Engineer — Systems & Networking"
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          {!config.resume_title && globalDefaults.resume_title && titleDraft === globalDefaults.resume_title && (
            <p className="text-xs text-slate-400 mt-0.5">From global defaults</p>
          )}
          {aiAnalysis?.recommended_title && titleDraft !== aiAnalysis.recommended_title && (
            <div className="mt-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2">
              <p className="text-xs font-medium text-yellow-700 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> AI suggestion
              </p>
              <p className="text-sm text-slate-800 font-medium">{aiAnalysis.recommended_title}</p>
              <button
                onClick={() => setTitleDraft(aiAnalysis.recommended_title)}
                className="mt-2 text-xs font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded px-2.5 py-1 hover:bg-yellow-200 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
          {aiAnalysis?.recommended_title && titleDraft === aiAnalysis.recommended_title && (
            <p className="text-xs text-yellow-600 mt-0.5 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Using AI-suggested title</p>
          )}
        </div>

        {/* Profile */}
        <div>
          <label className="flex items-center justify-between text-sm font-medium text-slate-600 mb-1">
            <span>Profile <span className="text-slate-400 font-normal text-xs">(LaTeX — leave blank for default)</span></span>
            <button
              type="button"
              onClick={() => setProfileDraft(globalDefaults.profile_text)}
              title="Reset to global default"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            ><RotateCcw className="w-3 h-3" /></button>
          </label>
          <textarea
            value={profileDraft}
            onChange={(e) => setProfileDraft(e.target.value)}
            rows={4}
            placeholder="e.g. Engineering student with experience in systems programming and embedded Linux."
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white"
          />
          {!config.profile_text && globalDefaults.profile_text && profileDraft === globalDefaults.profile_text && (
            <p className="text-xs text-slate-400 mt-0.5">From global defaults</p>
          )}
          {aiAnalysis?.recommended_profile && profileDraft !== aiAnalysis.recommended_profile && (
            <div className="mt-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2">
              <p className="text-xs font-medium text-yellow-700 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> AI suggestion
              </p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{aiAnalysis.recommended_profile}</p>
              <button
                onClick={() => setProfileDraft(aiAnalysis.recommended_profile)}
                className="mt-2 text-xs font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded px-2.5 py-1 hover:bg-yellow-200 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
          {aiAnalysis?.recommended_profile && profileDraft === aiAnalysis.recommended_profile && (
            <p className="text-xs text-yellow-600 mt-0.5 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Using AI-suggested profile</p>
          )}
        </div>

        {/* AI Context */}
        <div>
          <label className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
            <span>AI context <span className="text-slate-400 font-normal">(sent to AI only — not rendered in PDF)</span></span>
            <button
              type="button"
              onClick={() => setAiContextDraft(globalDefaults.ai_context)}
              title="Reset to global default"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            ><RotateCcw className="w-3 h-3" /></button>
          </label>
          <textarea
            value={aiContextDraft}
            onChange={(e) => setAiContextDraft(e.target.value)}
            rows={3}
            placeholder="e.g. I'm targeting a junior embedded position. My strongest area is C/Linux."
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y bg-white"
          />
          {!config.ai_context && globalDefaults.ai_context && aiContextDraft === globalDefaults.ai_context && (
            <p className="text-xs text-slate-400 mt-0.5">From global defaults</p>
          )}
        </div>
      </div>

      {hasRankings && (
        <p className="text-xs text-slate-400 mb-3">Sorted by AI relevance score ↓ within each section</p>
      )}

      {/* Entities grouped by type */}
      <div className="space-y-5">
        {TYPE_ORDER.map((type) => {
          const group = byType[type]
          if (group.length === 0) return null
          const isProjectsSection = type === 'projects'
          const isExperiencesSection = type === 'experiences'
          const hasAiScores = (isProjectsSection || isExperiencesSection) && config.ai_rankings.some((r) =>
            group.some((e) => e.id === r.entity_id)
          )
          return (
            <div key={type}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {TYPE_LABELS[type]}
                </h3>
                {isProjectsSection && hasAiScores && (
                  <button
                    onClick={applyAiProjectOrder}
                    className="text-xs px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                    title="Sort projects by AI relevance score"
                  >
                    Use AI Order
                  </button>
                )}
                {isExperiencesSection && hasAiScores && (
                  <button
                    onClick={applyAiExperienceOrder}
                    className="text-xs px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                    title="Sort experiences by AI relevance score"
                  >
                    Use AI Order
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {group.map((entity) => {
                  const isSelected = config.selected_entity_ids.includes(entity.id)
                  const aiRanking = config.ai_rankings.find((r) => r.entity_id === entity.id)
                  const score = aiRanking ? Math.round(aiRanking.score * 100) : null
                  const isSkill = entity.type === 'skills'
                  const skill = isSkill ? (entity as SkillMeta) : null
                  const isExpanded = expandedEntities.has(entity.id)
                  const tagOverride = config.skill_tag_overrides?.[entity.id]
                  const selectedTags = tagOverride ?? (skill?.tags ?? [])
                  const hasTagOverride = tagOverride !== undefined
                  const hasDescription = entity.type === 'experiences' || entity.type === 'projects'
                  const originalDescription = hasDescription ? (entity as { description: string }).description : ''
                  const aiSuggestedDesc = hasDescription ? aiAnalysis?.recommended_entity_descriptions?.[entity.id] : undefined
                  const isRecommended = aiAnalysis?.recommended_experience_ids?.includes(entity.id) || aiAnalysis?.recommended_project_ids?.includes(entity.id)
                  const descDraft = descriptionDrafts[entity.id] ?? config.entity_description_overrides?.[entity.id] ?? originalDescription
                  const hasDescOverride = !!(config.entity_description_overrides?.[entity.id])

                  return (
                    <div
                      key={entity.id}
                      className={[
                        'rounded-lg border transition-colors',
                        isSelected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 bg-white',
                      ].join(' ')}
                    >
                      {/* Main row */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEntity(entity.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-slate-900 truncate">
                              {entityLabel(entity)}
                            </span>
                            {(aiAnalysis?.recommended_experience_ids?.includes(entity.id) || aiAnalysis?.recommended_project_ids?.includes(entity.id)) && (entity.type === 'experiences' || entity.type === 'projects') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full shrink-0">
                                <Sparkles className="w-3 h-3" />
                                Recommended
                              </span>
                            )}
                            {aiAnalysis?.recommended_skill_ids?.includes(entity.id) && entity.type === 'skills' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full shrink-0">
                                <Sparkles className="w-3 h-3" />
                                Recommended
                              </span>
                            )}
                            {hasTagOverride && (
                              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                {selectedTags.length}/{skill?.tags.length} tags
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{entitySubLabel(entity)}</p>
                          {aiAnalysis && (entity.type === 'experiences' || entity.type === 'projects') && (
                            (() => {
                              const ranking = entity.type === 'experiences'
                                ? aiAnalysis.entities_by_type.experiences.find((e) => e.id === entity.id)
                                : aiAnalysis.entities_by_type.projects.find((e) => e.id === entity.id)
                              return ranking ? (
                                <div className="flex items-start gap-2 mt-1">
                                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                                    {ranking.score}%
                                  </span>
                                  <p className="text-xs text-slate-600 italic">{ranking.reason}</p>
                                </div>
                              ) : null
                            })()
                          )}
                        </div>
                        {score !== null && (
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${score}%` }} />
                            </div>
                            <span className="text-xs font-medium text-slate-600 w-8 text-right">{score}%</span>
                          </div>
                        )}
                        {isSkill && skill && (
                          <button
                            onClick={() => toggleExpanded(entity.id)}
                            className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                        {hasDescription && (
                          <button
                            onClick={() => toggleExpanded(entity.id)}
                            className={['shrink-0 transition-colors', hasDescOverride ? 'text-amber-500 hover:text-amber-700' : 'text-slate-400 hover:text-slate-700'].join(' ')}
                            title="Edit description"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                        {entity.type === 'projects' && (
                          <div className="flex gap-1 shrink-0">
                            {(() => {
                              const order = config.project_order ?? []
                              const idx = order.indexOf(entity.id)
                              // Only disable if project is in the order list
                              const isAtTop = idx === 0
                              const isAtBottom = idx > -1 && idx === order.length - 1
                              return (
                                <>
                                  <button
                                    onClick={() => moveProject(entity.id, 'up')}
                                    disabled={isAtTop}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Move up"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveProject(entity.id, 'down')}
                                    disabled={isAtBottom}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Move down"
                                  >
                                    ↓
                                  </button>
                                </>
                              )
                            })()}
                          </div>
                        )}
                        {entity.type === 'experiences' && (
                          <div className="flex gap-1 shrink-0">
                            {(() => {
                              const order = config.experience_order ?? []
                              const idx = order.indexOf(entity.id)
                              // Only disable if experience is in the order list
                              const isAtTop = idx === 0
                              const isAtBottom = idx > -1 && idx === order.length - 1
                              return (
                                <>
                                  <button
                                    onClick={() => moveExperience(entity.id, 'up')}
                                    disabled={isAtTop}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Move up"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveExperience(entity.id, 'down')}
                                    disabled={isAtBottom}
                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Move down"
                                  >
                                    ↓
                                  </button>
                                </>
                              )
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Description editor for experiences & projects */}
                      {hasDescription && isExpanded && (
                        <div className="px-4 pb-3 border-t border-slate-100">
                          <p className="text-xs text-slate-400 mt-2 mb-1">Description for PDF:</p>
                          <textarea
                            value={descDraft}
                            onChange={(e) => setDescriptionDrafts((prev) => ({ ...prev, [entity.id]: e.target.value }))}
                            onBlur={(e) => setDescriptionOverride(entity.id, e.target.value, originalDescription)}
                            rows={4}
                            className={[
                              'w-full rounded border px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white',
                              hasDescOverride ? 'border-amber-300' : 'border-slate-300',
                            ].join(' ')}
                          />
                          {aiSuggestedDesc && isRecommended && descDraft !== aiSuggestedDesc && (
                            <div className="mt-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2">
                              <p className="text-xs font-medium text-yellow-700 flex items-center gap-1.5 mb-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> AI suggestion
                              </p>
                              <p className="text-sm text-slate-800 whitespace-pre-wrap">{aiSuggestedDesc}</p>
                              <button
                                onClick={() => {
                                  setDescriptionDrafts((prev) => ({ ...prev, [entity.id]: aiSuggestedDesc }))
                                  persistConfig({ ...config, entity_description_overrides: { ...(config.entity_description_overrides ?? {}), [entity.id]: aiSuggestedDesc } })
                                }}
                                className="mt-2 text-xs font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded px-2.5 py-1 hover:bg-yellow-200 transition-colors"
                              >
                                Apply
                              </button>
                            </div>
                          )}
                          {hasDescOverride && (
                            <button
                              onClick={() => setDescriptionOverride(entity.id, originalDescription, originalDescription)}
                              className="mt-1.5 text-xs text-slate-400 hover:text-slate-600 underline"
                            >
                              Reset to original
                            </button>
                          )}
                        </div>
                      )}

                      {/* Tag selector for skills */}
                      {isSkill && skill && isExpanded && (
                        <div className="px-4 pb-3 border-t border-slate-100">
                          <p className="text-xs text-slate-400 mt-2 mb-1.5">Select items to include in PDF:</p>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {Array.from(new Set([...skill.tags, ...selectedTags])).map((tag) => {
                              const checked = selectedTags.includes(tag)
                              const isAiOnly = !skill.tags.includes(tag)
                              return (
                                <button
                                  key={tag}
                                  onClick={() => toggleSkillTag(entity.id, tag, skill.tags)}
                                  className={[
                                    'text-xs px-2 py-0.5 rounded border transition-colors',
                                    checked
                                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                                      : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400',
                                    isAiOnly && !checked ? 'opacity-50 line-through' : '',
                                  ].join(' ')}
                                  title={isAiOnly ? 'AI-added tag, uncheck to remove' : ''}
                                >
                                  {tag}
                                </button>
                              )
                            })}
                            {/* Add tag button / inline search */}
                            {tagAddEntityId === entity.id ? (
                              <div className="relative">
                                <input
                                  ref={tagInputRef}
                                  autoFocus
                                  value={tagAddQuery}
                                  onChange={(e) => setTagAddQuery(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') { setTagAddEntityId(null); setTagAddQuery('') }
                                    if (e.key === 'Enter' && tagAddQuery.trim()) addTagToLibrary(entity.id, tagAddQuery.trim())
                                  }}
                                  onBlur={() => setTimeout(() => { setTagAddEntityId(null); setTagAddQuery('') }, 150)}
                                  placeholder="Search or create…"
                                  className="rounded border border-blue-400 px-2 py-0.5 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                                {/* Dropdown */}
                                {(() => {
                                  const allTags = [...new Set(
                                    (entities.filter((e) => e.type === 'skills') as SkillMeta[])
                                      .flatMap((s) => s.tags)
                                  )].sort()
                                  const filtered = allTags.filter(
                                    (t) => !skill.tags.includes(t) &&
                                      (!tagAddQuery || t.toLowerCase().includes(tagAddQuery.toLowerCase()))
                                  )
                                  const showCreate = tagAddQuery.trim() && !skill.tags.includes(tagAddQuery.trim())
                                  if (!showCreate && filtered.length === 0) return null
                                  return (
                                    <div className="absolute z-20 top-full mt-1 left-0 w-48 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                      {showCreate && (
                                        <button
                                          onMouseDown={() => addTagToLibrary(entity.id, tagAddQuery.trim())}
                                          className="w-full text-left px-3 py-1.5 text-xs text-blue-700 font-medium hover:bg-blue-50 border-b border-slate-100"
                                        >
                                          <Plus className="inline w-3 h-3 mr-1" />Add &ldquo;{tagAddQuery.trim()}&rdquo;
                                        </button>
                                      )}
                                      {filtered.map((t) => (
                                        <button
                                          key={t}
                                          onMouseDown={() => addTagToLibrary(entity.id, t)}
                                          className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                        >
                                          {t}
                                        </button>
                                      ))}
                                    </div>
                                  )
                                })()}
                              </div>
                            ) : (
                              <button
                                onClick={() => { setTagAddEntityId(entity.id); setTagAddQuery('') }}
                                disabled={savingTag === entity.id}
                                className="text-xs px-1.5 py-0.5 rounded border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors inline-flex items-center gap-0.5"
                                title="Add tag to library"
                              >
                                {savingTag === entity.id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                              </button>
                            )}
                          </div>
                          {/* Suggested new tags for this skill */}
                          {aiAnalysis?.suggested_new_skill_tags?.filter((s) => s.skill_id === entity.id).map((s) => (
                            <div key={s.tag} className="mt-2 pt-2 border-t border-dashed border-slate-200">
                              <p className="text-xs text-slate-400 mb-1">AI suggests adding:</p>
                              <button
                                onClick={() => addSuggestedTag(entity.id, s.tag, skill)}
                                disabled={addingEntity === `${entity.id}:${s.tag}` || skill.tags.includes(s.tag)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-dashed border-green-400 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 transition-colors"
                              >
                                {addingEntity === `${entity.id}:${s.tag}` ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                                {s.tag}
                              </button>
                              <span className="text-xs text-slate-400 ml-1">{s.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Suggested new skills from AI */}
      {aiAnalysis?.suggested_new_skills && aiAnalysis.suggested_new_skills.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">AI suggests adding to library</h3>
          <div className="space-y-1.5">
            {aiAnalysis.suggested_new_skills.map((suggestion) => {
              const alreadyExists = entities.some((e) => e.type === 'skills' && (e as SkillMeta).name.toLowerCase() === suggestion.name.toLowerCase())
              return (
                <div key={suggestion.name} className="flex items-start gap-3 rounded-lg border border-dashed border-green-300 bg-green-50 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{suggestion.name}</p>
                    <p className="text-xs text-slate-500">{suggestion.category} · {suggestion.level}</p>
                    {suggestion.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {suggestion.tags.map((t) => (
                          <span key={t} className="text-xs px-1.5 py-0.5 bg-white border border-green-200 text-green-700 rounded">{t}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-400 italic mt-1">{suggestion.reason}</p>
                  </div>
                  <button
                    onClick={() => addSuggestedSkill(suggestion)}
                    disabled={alreadyExists || addingEntity === suggestion.name}
                    className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-green-400 bg-white text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-default transition-colors font-medium"
                  >
                    {addingEntity === suggestion.name ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    {alreadyExists ? 'Already added' : 'Add to library'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {entities.length === 0 && (
        <p className="text-sm text-slate-400 italic">
          No entities in your library yet.{' '}
          <Link href="/entities/new" className="text-blue-600 hover:underline">Add one</Link>.
        </p>
      )}
    </div>
  )
}

