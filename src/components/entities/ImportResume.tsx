'use client'

import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, FileUp, LoaderCircle } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/Button'
import { ResponsiveDialog } from '@/components/ui/ResponsiveDialog'
import { eyebrow, focusRing } from '@/components/ui/styles'
import { cn } from '@/lib/cn'
import type { EntityMeta } from '@/types'
import { IMPORT_MAX_MB, checkFile, report, sendResume, withEntry, withoutEntry, type Report } from '@/lib/import-resume'
import { importNotice } from '@/components/legal/ai-privacy'
import { ImportedList } from './ImportedList'
import { ImportedProfile } from './ImportedProfile'

type Phase = { name: 'choose' } | { name: 'sending' } | { name: 'done'; report: Report; entries: EntityMeta[]; existing: EntityMeta[]; found: Record<string, string> } | { name: 'failed'; message: string }

interface Props {
  /** The look of the button that opens the dialog. */
  variant?: ButtonVariant
  size?: ButtonSize
}

/**
 * Import a resume (#110): a button, and the dialog it opens (a drawer on a phone). The user picks a PDF, it is read
 * and its entries go straight into the library; the dialog says what was added and what was not, and why, and lists
 * what was added: each entry opens in place to be fixed, or deleted (#281).
 */
export function ImportResume({ variant = 'primary', size = 'md' }: Props) {
  const router = useRouter()
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>({ name: 'choose' })
  const abort = useRef<AbortController | null>(null)

  function close() {
    // Closing while the PDF is being read gives up the wait: the request is cancelled.
    abort.current?.abort()
    abort.current = null
    // The library behind the dialog shows the new entries once it is closed: not before, because the first import
    // of an account replaces the call to import (where this dialog lives) with the library itself.
    const imported = phase.name === 'done'
    setOpen(false)
    setFile(null)
    setProblem(null)
    setPhase({ name: 'choose' })
    if (imported) router.refresh()
  }

  function pick(next: File | null) {
    setFile(next)
    setProblem(next ? checkFile(next) : null)
    if (phase.name === 'failed') setPhase({ name: 'choose' })
  }

  async function send() {
    if (!file || problem) return
    const controller = new AbortController()
    abort.current = controller
    setPhase({ name: 'sending' })
    const out = await sendResume(file, { signal: controller.signal })
    if (controller.signal.aborted) return
    abort.current = null
    if (out.ok) {
      setPhase({ name: 'done', report: report(out.result), entries: out.result.entries ?? [], existing: out.result.existing ?? [], found: out.result.profileFound ?? {} })
    } else {
      setPhase({ name: 'failed', message: out.message })
    }
  }

  const sending = phase.name === 'sending'

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} aria-label="Import a resume">
        <FileUp size={16} aria-hidden="true" />
        {/* Short on a phone, where it shares a line with other buttons. */}
        <span className="md:hidden">Import</span>
        <span className="max-md:hidden">Import a resume</span>
      </Button>

      <ResponsiveDialog open={open} onClose={close} title="Import a resume" size="wide">
        <div className="flex flex-col gap-section">
          {phase.name === 'done' ? (
            <>
              {/* Nothing is waiting to be confirmed: the import is in the library, and what is changed below saves itself. */}
              {phase.report.total === 0 && <p className="text-small text-ink-muted">{phase.report.headline}</p>}
              {phase.report.notes.length > 0 && (
                <ul className="list-disc space-y-1 pl-indent text-small text-ink-muted">
                  {phase.report.notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              )}
              <ImportedProfile found={phase.found} />
              {phase.entries.length > 0 && (
                <ImportedList
                  entries={phase.entries}
                  onSaved={(saved) => setPhase((p) => (p.name === 'done' ? { ...p, entries: withEntry(p.entries, saved) } : p))}
                  onDeleted={(gone) => setPhase((p) => (p.name === 'done' ? { ...p, entries: withoutEntry(p.entries, gone.id) } : p))}
                />
              )}
              {phase.existing.length > 0 && (
                <details className="group flex flex-col gap-heading">
                  <summary className={cn(eyebrow, 'flex cursor-pointer list-none items-center gap-2 rounded-control', focusRing)}>
                    <ChevronRight size={14} aria-hidden="true" className="transition-transform group-open:rotate-90" />
                    Already in your library ({phase.existing.length})
                  </summary>
                  <div className="mt-heading flex flex-col gap-stack">
                    <p className="text-small text-ink-muted">These were found in your resume but were already registered, so they were not added again.</p>
                    <ImportedList
                      entries={phase.existing}
                      onSaved={(saved) => setPhase((p) => (p.name === 'done' ? { ...p, existing: withEntry(p.existing, saved) } : p))}
                      onDeleted={(gone) => setPhase((p) => (p.name === 'done' ? { ...p, existing: withoutEntry(p.existing, gone.id) } : p))}
                    />
                  </div>
                </details>
              )}
            </>
          ) : (
            <form
              className="flex flex-col gap-field"
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
            >
              <div className="flex flex-col gap-1">
                <label htmlFor={inputId} className="text-small-strong">Your resume (PDF, {IMPORT_MAX_MB} MB at most)</label>
                <input
                  id={inputId}
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={sending}
                  aria-invalid={problem ? true : undefined}
                  onChange={(e) => pick(e.target.files?.[0] ?? null)}
                  className={cn(
                    'block w-full cursor-pointer rounded-control border-2 border-ink bg-surface p-2 text-small',
                    'file:mr-inline file:cursor-pointer file:rounded-control file:border-2 file:border-ink file:bg-accent file:px-control file:py-1 file:font-semibold file:text-ink',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    focusRing,
                  )}
                />
              </div>
              <p className="text-caption text-ink-muted">
                {importNotice()}{' '}
                <a href="/privacy#import" target="_blank" rel="noopener" className="underline underline-offset-2">Privacy policy</a>
              </p>
              {problem && <Alert>{problem}</Alert>}
              {phase.name === 'failed' && <Alert>{phase.message}</Alert>}
              {sending && (
                <p role="status" className="text-small-strong flex items-center gap-2">
                  <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Reading your resume… this takes about 10 seconds.
                </p>
              )}
              <div className="flex justify-end gap-inline">
                <Button variant="secondary" onClick={close}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={!file || !!problem || sending}>
                  {phase.name === 'failed' ? 'Try again' : 'Import'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </ResponsiveDialog>
    </>
  )
}
