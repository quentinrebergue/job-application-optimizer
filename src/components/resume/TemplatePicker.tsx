'use client'

import type { TemplateInfo } from '@/schemas/resume-template'
import { cn } from '@/lib/cn'
import { controlClasses } from '@/components/ui/Input'

export interface TemplateChoice {
  template: string
  options: Record<string, string | number>
}

export const DEFAULT_TEMPLATE_CHOICE: TemplateChoice = { template: 'classic', options: {} }

interface Props {
  templates: TemplateInfo[]
  value: TemplateChoice
  onChange: (next: TemplateChoice) => void
  disabled?: boolean
}

const FIELD = cn(controlClasses, 'mt-1 h-9 w-auto')
const LABEL = 'text-xs font-semibold text-ink'

// "datePlacement" -> "Date placement"
function labelFor(name: string): string {
  const words = name.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Template choice plus one control per option the template declares in its
 * manifest: a slider for numbers, a colour input, a select for enums. Nothing
 * here is specific to a template, a new template shows up with its own options.
 */
export function TemplatePicker({ templates, value, onChange, disabled }: Props) {
  const current = templates.find((t) => t.id === value.template) ?? templates[0]
  if (!current) return null

  function setOption(name: string, option: string | number) {
    onChange({ template: current.id, options: { ...value.options, [name]: option } })
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className={LABEL}>
        Template
        <select
          value={current.id}
          disabled={disabled}
          onChange={(e) => onChange({ template: e.target.value, options: {} })}
          className={FIELD}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {Object.entries(current.options).map(([name, spec]) => {
        const shown = value.options[name] ?? spec.default
        return (
          <label key={name} className={LABEL}>
            {labelFor(name)}
            {spec.type === 'enum' && (
              <select
                value={String(shown)}
                disabled={disabled}
                onChange={(e) => setOption(name, e.target.value)}
                className={FIELD}
              >
                {spec.values?.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
            {spec.type === 'number' && (
              <span className="mt-1 flex h-9 items-center gap-2">
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={0.5}
                  value={Number(shown)}
                  disabled={disabled}
                  onChange={(e) => setOption(name, e.target.valueAsNumber)}
                  className="w-28 accent-ink"
                />
                <span className="w-9 text-right font-normal tabular-nums">{Number(shown)}</span>
              </span>
            )}
            {spec.type === 'color' && (
              <input
                type="color"
                value={String(shown)}
                disabled={disabled}
                onChange={(e) => setOption(name, e.target.value)}
                className="mt-1 block h-9 w-12 cursor-pointer rounded-control border-2 border-ink bg-surface"
              />
            )}
          </label>
        )
      })}
    </div>
  )
}
