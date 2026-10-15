'use client'

import type { TemplateInfo, TemplateOption } from '@/schemas/resume-template'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { FIXED_TEMPLATE_OPTIONS } from '@/config'
import { cn } from '@/lib/cn'
import { controlClasses } from '@/components/ui/Input'

export interface TemplateChoice {
  template: string
  options: Record<string, string | number>
}

export const DEFAULT_TEMPLATE_CHOICE: TemplateChoice = { template: 'classic', options: {} }

/** The options to render with: the chosen ones, plus the app's fixed ones the template declares. */
export function effectiveOptions(template: TemplateInfo | undefined, options: TemplateChoice['options']): TemplateChoice['options'] {
  const fixed = Object.fromEntries(
    Object.entries(FIXED_TEMPLATE_OPTIONS).filter(([name]) => template?.options[name] !== undefined),
  )
  return { ...options, ...fixed }
}

/** Options kept when switching template: those the new one also declares (e.g. the accent colour). */
function carriedOptions(next: TemplateInfo | undefined, options: TemplateChoice['options']): TemplateChoice['options'] {
  return Object.fromEntries(Object.entries(options).filter(([name]) => next?.options[name] !== undefined))
}

interface Props {
  templates: TemplateInfo[]
  value: TemplateChoice
  onChange: (next: TemplateChoice) => void
  disabled?: boolean
}

const CONTROL = cn(controlClasses, 'h-10')
const LABEL = 'text-label flex flex-col gap-1 text-ink'

// "datePlacement" -> "Date placement"
function labelFor(name: string): string {
  const words = name.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * A number option (font size, margin…) as three named steps instead of a
 * slider: the template's minimum, default and maximum.
 */
function sizeSteps(spec: TemplateOption): { label: string; value: number }[] {
  const def = Number(spec.default)
  return [
    { label: 'Small', value: spec.min ?? def },
    { label: 'Medium', value: def },
    { label: 'Large', value: spec.max ?? def },
  ]
}

/** The step shown as selected: the closest to the saved value. */
function nearestStep(spec: TemplateOption, value: number): number {
  return sizeSteps(spec).reduce((best, step) => (Math.abs(step.value - value) < Math.abs(best - value) ? step.value : best), Number(spec.default))
}

/**
 * Template choice plus one control per option the template declares in its
 * manifest: three steps for numbers, a colour input, a select for enums. Nothing
 * here is specific to a template, a new template shows up with its own options.
 */
export function TemplatePicker({ templates, value, onChange, disabled }: Props) {
  const current = templates.find((t) => t.id === value.template) ?? templates[0]
  if (!current) return null

  function setOption(name: string, option: string | number) {
    onChange({ template: current.id, options: { ...value.options, [name]: option } })
  }

  // A grid of equal fields: the template first, then its options.
  return (
    <div className="grid gap-field sm:grid-cols-2">
      <label className={LABEL}>
        Template
        <select
          value={current.id}
          disabled={disabled}
          onChange={(e) => onChange({ template: e.target.value, options: carriedOptions(templates.find((t) => t.id === e.target.value), value.options) })}
          className={CONTROL}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {/* Options the app fixes (FIXED_TEMPLATE_OPTIONS) are not offered. */}
      {Object.entries(current.options).filter(([name]) => FIXED_TEMPLATE_OPTIONS[name] === undefined).map(([name, spec]) => {
        const shown = value.options[name] ?? spec.default
        // A label around a group of buttons would click the first one; the steps name themselves.
        const Wrapper = spec.type === 'number' ? 'div' : 'label'
        return (
          <Wrapper key={name} className={LABEL}>
            <span>{labelFor(name)}</span>
            {spec.type === 'enum' && (
              <select value={String(shown)} disabled={disabled} onChange={(e) => setOption(name, e.target.value)} className={CONTROL}>
                {spec.values?.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
            {spec.type === 'number' && (
              <SegmentedTabs
                label={labelFor(name)}
                variant="standalone"
                size="sm"
                className="h-10"
                items={sizeSteps(spec).map((step) => ({ value: String(step.value), label: step.label }))}
                value={String(nearestStep(spec, Number(shown)))}
                onChange={(v) => { if (!disabled) setOption(name, Number(v)) }}
              />
            )}
            {spec.type === 'color' && (
              <span className={cn(CONTROL, 'flex items-center gap-inline')}>
                <input
                  type="color"
                  value={String(shown)}
                  disabled={disabled}
                  onChange={(e) => setOption(name, e.target.value)}
                  className="h-6 w-10 cursor-pointer rounded-xs border-2 border-ink bg-surface p-0"
                />
                <span className="font-normal uppercase tabular-nums">{String(shown)}</span>
              </span>
            )}
          </Wrapper>
        )
      })}
    </div>
  )
}
