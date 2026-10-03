'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/format'
import Link from 'next/link'
import type { SkillMeta } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { DEFAULT_TEMPLATE_CHOICE, TemplatePicker, effectiveOptions, type TemplateChoice } from '@/components/resume/TemplatePicker'
import { useTemplates } from '@/components/resume/useTemplates'
import { useAiRanking } from './useAiRanking'
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
  /** The page shows one save indicator for the offer and the resume */
  onSavingChange?: (saving: boolean) => void
}

/** Downloads the PDF built from the job's resume config. */
function usePdf(jobId: string) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(entityIds: string[], skillTagOverrides: Record<string, string[]> | undefined, choice: TemplateChoice) {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, entityIds, skillTagOverrides, template: choice.template, options: choice.options }),
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

/** The floating actions share one size. */
const ACTION = 'h-11 px-3 text-sm sm:h-12 sm:px-5 sm:text-base'

/**
 * "Resume for this job": the header, the library by type, the template; at the
 * bottom of the screen, the three actions (reset, rank with AI, download the PDF).
 */
export function ResumeConfigPanel({ jobId, aiAnalysis, onRankingComplete, onClearAi, hasAiData, onSavingChange }: Props) {
  const panel = useResumeConfig(jobId, aiAnalysis)
  const pdf = usePdf(jobId)
  const ai = useAiRanking(jobId, onRankingComplete)
  const { templates, error: templatesError } = useTemplates()
  const { entities, config, drafts, defaults } = panel
  useEffect(() => { onSavingChange?.(panel.saving) }, [panel.saving, onSavingChange])

  if (panel.loading) return <p className="text-sm text-ink-muted">Loading your library…</p>

  const groups = groupEntities(entities, config, aiAnalysis)
  const libraryTags = [...new Set((entities.filter((e) => e.type === 'skills') as SkillMeta[]).flatMap((s) => s.tags))].sort()
  const selectedCount = config.selected_entity_ids.length
  const templateChoice: TemplateChoice = {
    template: config.resume_template ?? DEFAULT_TEMPLATE_CHOICE.template,
    options: config.resume_options ?? {},
  }

  function startAgain() {
    if (!confirm('Reset to your defaults? The selection, the custom texts and the AI ranking of this resume are cleared.')) return
    panel.reset()
    if (hasAiData) onClearAi?.()
  }

  function download() {
    const template = templates.find((t) => t.id === templateChoice.template)
    void pdf.generate(
      selectedCount > 0 ? config.selected_entity_ids : entities.map((e) => e.id),
      config.skill_tag_overrides,
      { template: templateChoice.template, options: effectiveOptions(template, templateChoice.options) },
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {panel.error && <Alert>{panel.error}</Alert>}

      <ContentFields
        drafts={{ resume_title: drafts.resume_title, profile_text: drafts.profile_text }}
        defaults={{ resume_title: defaults.resume_title, profile_text: defaults.profile_text }}
        saved={{ resume_title: config.resume_title, profile_text: config.profile_text }}
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

      <section aria-labelledby="section-template" className="flex flex-col gap-4">
        <h4 id="section-template" className="text-lg font-extrabold">Template</h4>
        <TemplatePicker
          templates={templates}
          value={templateChoice}
          onChange={(next) => panel.update((c) => ({ ...c, resume_template: next.template, resume_options: next.options }))}
          disabled={pdf.generating}
        />
        {templatesError && <Alert variant="info">{templatesError}</Alert>}
      </section>

      {/* The two actions float at the bottom of the screen while the list scrolls (QA-11). */}
      <div className="sticky bottom-4 z-30 flex flex-col items-end gap-2">
        {ai.error && <Alert className="self-stretch">Ranking failed: {ai.error}</Alert>}
        {pdf.error && <Alert className="self-stretch">{pdf.error}</Alert>}
        {/* Three actions of the same size; shorter labels on phones so they fit on one row. */}
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
          <Button variant="secondary" onClick={startAgain} aria-label="Reset to defaults" className={ACTION}>
            <span className="sm:hidden">Reset</span>
            <span className="hidden sm:inline">Reset to defaults</span>
          </Button>
          <Button
            variant="ai"
            onClick={ai.rank}
            disabled={ai.ranking}
            className={ACTION}
            title={hasAiData && aiAnalysis ? `Last ranked on ${formatDate(aiAnalysis.analyzed_at)}` : undefined}
          >
            {ai.ranking ? 'Ranking…' : hasAiData ? 'Rank again' : 'Rank with AI'}
          </Button>
          <Button onClick={download} disabled={pdf.generating} className={ACTION}>
            {pdf.generating ? 'Generating…' : 'Download PDF'}
          </Button>
        </div>
      </div>
    </div>
  )
}
