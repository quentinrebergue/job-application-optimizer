'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/format'
import Link from 'next/link'
import type { SkillMeta } from '@/types'
import type { AIAnalysisResult } from '@/types/job'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
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
  /** The page shows one save indicator for the offer and the resume */
  onSavingChange?: (saving: boolean) => void
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

function Step({ number, title, action, children }: { number: number; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${number}`} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`step-${number}`} className="flex items-center gap-3 text-xl font-extrabold tracking-tight">
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-control border-2 border-ink bg-ink text-base text-surface">
            {number}
          </span>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** "Resume for this job" in three steps: tailor with AI, choose the content, pick a template and download. */
export function ResumeConfigPanel({ jobId, aiAnalysis, onRankingComplete, onClearAi, hasAiData, onSavingChange }: Props) {
  const panel = useResumeConfig(jobId, aiAnalysis)
  useEffect(() => { onSavingChange?.(panel.saving) }, [panel.saving, onSavingChange])
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
    <div className="flex flex-col gap-10">
      {panel.error && <Alert>{panel.error}</Alert>}

      <Step number={1} title="Tailor with AI">
        <p className="text-sm text-ink-muted">
          {hasAiData && aiAnalysis
            ? <>Ranked on <span className="tabular-nums">{formatDate(aiAnalysis.analyzed_at)}</span>: your entries are scored and the best ones selected.</>
            : 'The AI reads the offer, scores every entry of your library and selects the best ones.'}
        </p>
        <div className="flex flex-wrap items-start gap-3">
          {onRankingComplete && (
            <AIRankButton jobId={jobId} label={hasAiData ? 'Rank again' : 'Rank with AI'} onRankingComplete={onRankingComplete} />
          )}
          {hasAiData && onClearAi && <Button variant="ghost" onClick={onClearAi}>Clear ranking</Button>}
        </div>
      </Step>

      <Step number={2} title="Content">
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
        <div className="border-t-2 border-dashed border-ink pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { if (confirm('Start again from your defaults? The selection and the custom texts of this resume are cleared.')) panel.reset() }}
          >
            Start again from my defaults
          </Button>
        </div>
      </Step>

      <Step number={3} title="Template">
        <TemplatePicker
          templates={templates}
          value={templateChoice}
          onChange={(next) => panel.update((c) => ({ ...c, resume_template: next.template, resume_options: next.options }))}
          disabled={pdf.generating}
        />
        {templatesError && <Alert variant="info">{templatesError}</Alert>}
      </Step>

      {/* Floats at the bottom of the screen while the list scrolls (QA-11). */}
      <div className="sticky bottom-4 z-30 flex flex-col items-end gap-2">
        {pdf.error && <Alert className="self-stretch">{pdf.error}</Alert>}
        <Button
          onClick={() => pdf.generate(
            selectedCount > 0 ? config.selected_entity_ids : entities.map((e) => e.id),
            config.skill_tag_overrides,
          )}
          disabled={pdf.generating}
          className="h-12 px-6 text-base"
        >
          {pdf.generating ? 'Generating…' : 'Download PDF'}
        </Button>
      </div>
    </div>
  )
}
