'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { SkillMeta } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { eyebrow } from '@/components/ui/styles'
import { DEFAULT_TEMPLATE_CHOICE, TemplatePicker, type TemplateChoice } from '@/components/resume/TemplatePicker'
import { useTemplates } from '@/components/resume/useTemplates'
import { AIRankButton } from './AIRankButton'
import { ContentFields } from './resume-config/ContentFields'
import { EntitySection } from './resume-config/EntitySection'
import { SuggestedSkills } from './resume-config/SuggestedSkills'
import { TYPE_ORDER, groupEntities } from './resume-config/logic'
import { useResumeConfig } from './resume-config/useResumeConfig'

interface Props {
  jobId: string
  aiAnalysis?: AIAnalysisResult | null
  onRankingComplete?: (result: AIAnalysisResult) => void
  onClearAi?: () => void
  hasAiData?: boolean
}

/** Downloads the PDF built from the job's resume config. */
function usePdf(jobId: string) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(entityIds: string[], skillTagOverrides?: Record<string, string[]>) {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, entityIds, skillTagOverrides }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Generation failed. Try again.')
      }
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `resume-${jobId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  return { generating, error, generate }
}

/** "Resume for this job": what goes into the PDF, then one click to download it. */
export function ResumeConfigPanel({ jobId, aiAnalysis, onRankingComplete, onClearAi, hasAiData }: Props) {
  const panel = useResumeConfig(jobId, aiAnalysis)
  const pdf = usePdf(jobId)
  const { templates, error: templatesError } = useTemplates()
  const { entities, config, drafts, defaults } = panel

  if (panel.loading) return <p className="text-sm text-ink-muted">Loading your library…</p>

  const groups = groupEntities(entities, config, aiAnalysis)
  const libraryTags = [...new Set((entities.filter((e) => e.type === 'skills') as SkillMeta[]).flatMap((s) => s.tags))].sort()
  const selectedCount = config.selected_entity_ids.length
  const templateChoice: TemplateChoice = {
    template: config.resume_template ?? DEFAULT_TEMPLATE_CHOICE.template,
    options: config.resume_options ?? {},
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        {onRankingComplete && <AIRankButton jobId={jobId} onRankingComplete={onRankingComplete} />}
        <div className="flex flex-wrap gap-2">
          {hasAiData && onClearAi && (
            <Button variant="ghost" size="sm" onClick={onClearAi}>Clear AI analysis</Button>
          )}
          <Button variant="ghost" size="sm" onClick={panel.reset}>Reset selection</Button>
        </div>
      </div>

      {panel.error && <Alert>{panel.error}</Alert>}

      <div className="flex flex-col gap-3">
        <p className={eyebrow}>Template</p>
        <TemplatePicker
          templates={templates}
          value={templateChoice}
          onChange={(next) => panel.update((c) => ({ ...c, resume_template: next.template, resume_options: next.options }))}
          disabled={pdf.generating}
        />
        {templatesError && <Alert variant="info">{templatesError}</Alert>}
      </div>

      <ContentFields
        drafts={drafts}
        defaults={defaults}
        saved={{ resume_title: config.resume_title, profile_text: config.profile_text, ai_context: config.ai_context }}
        aiTitle={aiAnalysis?.recommended_title}
        aiProfile={aiAnalysis?.recommended_profile}
        onChange={panel.editText}
      />

      {TYPE_ORDER.map((type) => (
        <EntitySection key={type} type={type} group={groups[type]} panel={panel} ai={aiAnalysis} libraryTags={libraryTags} />
      ))}

      <SuggestedSkills
        suggestions={aiAnalysis?.suggested_new_skills ?? []}
        entities={entities}
        busy={panel.busy}
        onAdd={panel.addSuggestedSkill}
      />

      {entities.length === 0 && (
        <p className="text-sm text-ink-muted">
          Your library is empty.{' '}
          <Link href="/entities/new" className="font-semibold text-accent-strong underline underline-offset-4">Add an entry</Link>.
        </p>
      )}

      {/* Stays at the bottom of the screen while the list scrolls (QA-11). */}
      <div className="sticky bottom-4 z-30 flex flex-col gap-2">
        {pdf.error && <Alert>{pdf.error}</Alert>}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border-2 border-ink bg-surface p-3 shadow-hard">
          <p className="text-sm" aria-live="polite">
            <span className="font-semibold tabular-nums">
              {selectedCount === 0 ? 'Everything' : `${selectedCount} of ${entities.length}`}
            </span>{' '}
            in the resume
            {panel.saving && <span className="text-ink-muted"> · Saving…</span>}
          </p>
          <Button
            onClick={() => pdf.generate(
              selectedCount > 0 ? config.selected_entity_ids : entities.map((e) => e.id),
              config.skill_tag_overrides,
            )}
            disabled={pdf.generating}
          >
            {pdf.generating ? 'Generating…' : 'Download PDF'}
          </Button>
        </div>
      </div>
    </div>
  )
}
