'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { LIMITS } from '@/config/limits'
import type { DescriptionVariant } from '@/types'
import { DeleteButton } from './DeleteButton'

/** The value of the segment of the main description; a version is `v0`, `v1`... (its place in the list). */
export const MAIN_VERSION = 'main'
export const versionKey = (index: number) => `v${index}`
/** The place of a version in the list from the value of a segment; -1 for the main description or a version that is gone. */
export function versionIndex(active: string, count: number): number {
  const index = active.startsWith('v') ? Number(active.slice(1)) : -1
  return Number.isInteger(index) && index >= 0 && index < count ? index : -1
}

interface Props {
  variants: DescriptionVariant[]
  /** `MAIN_VERSION` or `versionKey(i)`. */
  active: string
  error?: string
  onSelect: (active: string) => void
  onAdd: () => void
  onRename: (name: string) => void
  /** The version on show takes the place of the main description (and the main one of the version). */
  onMakeMain: () => void
  onDelete: () => void
}

/**
 * The versions of a description (#297), above its text: "Default", one segment per other version, and "Add" at the
 * end (up to a few). Choosing a segment shows its text in the field below; the name, the swap with the main
 * description and the deletion of a version are under the bar.
 */
export function DescriptionVersions({ variants, active, error, onSelect, onAdd, onRename, onMakeMain, onDelete }: Props) {
  const index = versionIndex(active, variants.length)
  const current = variants[index]

  return (
    <div className="flex flex-col gap-field">
      <SegmentedTabs
        label="Versions of the description"
        variant="standalone"
        size="sm"
        value={index === -1 ? MAIN_VERSION : versionKey(index)}
        onChange={onSelect}
        items={[
          { value: MAIN_VERSION, label: 'Default' },
          ...variants.map((v, i) => ({ value: versionKey(i), label: v.name.trim() || 'Untitled' })),
        ]}
        actions={
          variants.length < LIMITS.descriptionVariants.perEntry
            ? [{ key: 'add', label: 'Add', icon: <Plus aria-hidden className="size-4" />, ariaLabel: 'Add a version of the description', onClick: onAdd }]
            : []
        }
      />
      {current && (
        <div className="flex flex-col gap-field">
          <Field label="Name of this version">
            <Input value={current.name} onChange={(e) => onRename(e.target.value)} placeholder="Short" maxLength={LIMITS.descriptionVariants.name} />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-actions">
            <Button variant="ghost" size="sm" className="h-auto px-0" onClick={onMakeMain}>
              Use as the default description
            </Button>
            <DeleteButton name={current.name.trim() || 'this version'} onConfirm={onDelete} />
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-small text-danger">{error}</p>}
    </div>
  )
}
