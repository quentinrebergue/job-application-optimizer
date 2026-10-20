'use client'

import { SectionTitle } from '@/components/ui/SectionTitle'
import { useState } from 'react'
import type { EntityMeta, ProjectMeta, ResumeConfig, SkillMeta } from '@/types'
import { variantsOf, versionText } from '@/lib/description-variants'
import { MAX_PROJECT_TECH } from '@/lib/resume/build-payload'
import type { AIAnalysisResult } from '@/types/job'
import { Button } from '@/components/ui/Button'
import { DescriptionEditor } from './DescriptionEditor'
import { EntityRow, type RowState } from './EntityRow'
import { ReorderList } from './ReorderList'
import { SkillTagPicker } from './SkillTagPicker'
import { TYPE_LABELS, applyAiOrder, backToChronologicalOrder, hasCustomExperienceOrder, moveEntity, setDescription, setDescriptionVariant, toggleEntity, toggleProjectTech, toggleSkillTag, type EntityType } from './logic'
import type { useResumeConfig } from './useResumeConfig'

type Panel = ReturnType<typeof useResumeConfig>

interface Props {
  type: EntityType
  group: EntityMeta[]
  panel: Panel
  ai?: AIAnalysisResult | null
  libraryTags: string[]
}

function rowState(entity: EntityMeta, config: ResumeConfig, expanded: Set<string>, ai?: AIAnalysisResult | null): RowState {
  const live = entity.type !== 'education'
    ? ai?.entities_by_type[entity.type].find((r) => r.id === entity.id)
    : undefined
  const saved = config.ai_rankings.find((r) => r.entity_id === entity.id)
  const recommended = entity.type === 'skills'
    ? !!ai?.recommended_skill_ids?.includes(entity.id)
    : !!(ai?.recommended_experience_ids?.includes(entity.id) || ai?.recommended_project_ids?.includes(entity.id))
  const tags = entity.type === 'skills' ? config.skill_tag_overrides?.[entity.id] : undefined

  return {
    selected: config.selected_entity_ids.includes(entity.id),
    expanded: expanded.has(entity.id),
    recommended: recommended && entity.type !== 'education',
    level: live?.level ?? null,
    score: live?.score !== undefined ? Math.round(live.score) : live?.level === undefined && saved ? Math.round(saved.score * 100) : null,
    reason: live?.reason,
    tagCount: tags ? `${tags.length}/${(entity as SkillMeta).tags.length} tags` : undefined,
  }
}

/** One type of entries (experiences, projects…) with its rows. */
export function EntitySection({ type, group, panel, ai, libraryTags }: Props) {
  const { config, entities, expanded, update } = panel
  const [reordering, setReordering] = useState(false)
  if (group.length === 0) return null

  const orderable = type === 'experiences' || type === 'projects'
  const hasScores = orderable && config.ai_rankings.some((r) => group.some((e) => e.id === r.entity_id))
  // The group is already in resume order; only included entries are printed, so only they are ordered.
  const included = group.filter((e) => config.selected_entity_ids.includes(e.id))
  const canReorder = orderable && included.length > 1

  return (
    <section aria-labelledby={`section-${type}`} className="flex flex-col gap-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle as="h4" id={`section-${type}`}>{TYPE_LABELS[type]}</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          {type === 'projects' && (
            <label className="text-small flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={config.show_project_tech !== false}
                onChange={() => update(toggleProjectTech)}
                className="size-5 cursor-pointer accent-ink"
              />
              Show technologies
            </label>
          )}
          {reordering && hasScores && (
            <Button variant="secondary" size="sm" onClick={() => update((c) => applyAiOrder(c, entities, type))}>
              Order by AI score
            </Button>
          )}
          {canReorder && (
            <Button variant={reordering ? 'primary' : 'secondary'} size="sm" onClick={() => setReordering((v) => !v)}>
              {reordering ? 'Done' : 'Reorder'}
            </Button>
          )}
        </div>
      </div>
      {/* A long list is cut on the resume, not in the library: say so where the user can see it is happening. */}
      {type === 'projects' && config.show_project_tech !== false && included.some((p) => (p as ProjectMeta).tech.length > MAX_PROJECT_TECH) && (
        <p className="text-caption text-ink-muted">The first {MAX_PROJECT_TECH} technologies of each project are printed.</p>
      )}
      {/* A saved order can put the experiences out of time (the AI's, before #295, or the user's own): say so, and offer the way back. */}
      {type === 'experiences' && hasCustomExperienceOrder(config, entities) && (
        <p className="text-caption text-ink-muted flex flex-wrap items-center gap-2">
          The experiences follow a custom order, not the dates.
          <Button variant="ghost" size="sm" className="h-auto px-0" onClick={() => update(backToChronologicalOrder)}>
            Back to chronological order
          </Button>
        </p>
      )}
      {reordering && canReorder ? (
        <ReorderList
          items={included}
          onMove={(id, direction) => update((c) => (orderable ? moveEntity(c, type, id, direction, included.map((e) => e.id)) : c))}
        />
      ) : (
      <ul className="flex flex-col gap-row">
        {group.map((entity) => {
          const state = rowState(entity, config, expanded, ai)
          const editor = editorFor(entity, panel, ai, libraryTags)
          return (
            <EntityRow
              key={entity.id}
              entity={entity}
              state={state}
              onToggle={() => update((c) => toggleEntity(c, entity))}
              onExpand={editor ? () => panel.toggleExpanded(entity.id) : undefined}
            >
              {editor}
            </EntityRow>
          )
        })}
      </ul>
      )}
    </section>
  )
}

function editorFor(entity: EntityMeta, panel: Panel, ai: AIAnalysisResult | null | undefined, libraryTags: string[]) {
  const { config, update } = panel

  if (entity.type === 'experiences' || entity.type === 'projects') {
    const chosen = config.description_variant?.[entity.id]
    const original = versionText(entity, chosen)
    const custom = config.entity_description_overrides?.[entity.id]
    const value = custom ?? original
    return (
      <DescriptionEditor
        key={`${chosen ?? ''}:${value}`}
        value={value}
        versions={variantsOf(entity).map((v) => v.name)}
        version={variantsOf(entity).some((v) => v.name === chosen) ? chosen : undefined}
        onVersion={(name) => update((c) => setDescriptionVariant(c, entity.id, name))}
        original={original}
        isCustom={!!custom}
        onCommit={(text) => update((c) => setDescription(c, entity.id, text, original))}
      />
    )
  }

  if (entity.type === 'skills') {
    return (
      <SkillTagPicker
        skill={entity}
        selected={config.skill_tag_overrides?.[entity.id] ?? entity.tags}
        libraryTags={libraryTags}
        suggestions={ai?.suggested_new_skill_tags?.filter((s) => s.skill_id === entity.id) ?? []}
        busy={panel.busy}
        onToggle={(tag) => update((c) => toggleSkillTag(c, entity.id, tag, entity.tags))}
        onAdd={(tag, select) => panel.addTag(entity, tag, select)}
      />
    )
  }

  return null
}
