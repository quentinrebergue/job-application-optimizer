'use client'

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { MAX_QUERY_LENGTH } from '@/lib/job-filter'

/** The id of the search field, for the button that opens it. */
export const SEARCH_FIELD_ID = 'job-search'

/** Below 825 px: the magnifier that opens the search field under the filter (and closes it, clearing the search). */
export function SearchToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Button
      variant={open ? 'primary' : 'secondary'}
      aria-label={open ? 'Close the search' : 'Search jobs'}
      aria-expanded={open}
      aria-controls={SEARCH_FIELD_ID}
      onClick={onToggle}
      className={cn('h-auto shrink-0 min-[825px]:hidden', !open && 'bg-panel')}
    >
      <Search size={16} aria-hidden="true" />
    </Button>
  )
}

interface FieldProps {
  value: string
  onChange: (value: string) => void
  /** Escape: clears the search (and, on a phone, closes the field). */
  onEscape: () => void
  /** For the page to give it the focus when the magnifier opens it. */
  inputRef?: React.Ref<HTMLInputElement>
  className?: string
}

/**
 * The search by title and company: the list follows each key typed. It is a normal field of the app (16 px on a
 * phone, so that the page does not zoom when it takes the focus).
 */
export function SearchField({ value, onChange, onEscape, inputRef, className }: FieldProps) {
  return (
    <Input
      id={SEARCH_FIELD_ID}
      type="search"
      inputMode="search"
      enterKeyHint="search"
      autoComplete="off"
      aria-label="Search by title or company"
      placeholder="Search by title or company"
      maxLength={MAX_QUERY_LENGTH}
      value={value}
      ref={inputRef}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Escape') onEscape() }}
      className={cn('min-[825px]:h-full', className)}
    />
  )
}
