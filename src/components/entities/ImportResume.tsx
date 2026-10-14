'use client'

import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, LoaderCircle } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button, type ButtonVariant } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { focusRing } from '@/components/ui/styles'
import { cn } from '@/lib/cn'
import { IMPORT_MAX_MB, checkFile, report, sendResume, type Report } from '@/lib/import-resume'
import { importNotice } from '@/components/legal/ai-privacy'

type Phase = { name: 'choose' } | { name: 'sending' } | { name: 'done'; report: Report } | { name: 'failed'; message: string }

interface Props {
  /** The look of the button that opens the dialog. */
  variant?: ButtonVariant
  label?: string
}

/**
 * Import a resume (#110): a button, and the dialog it opens. The user picks a PDF, it is read and its entries go
 * straight into the library (nothing to review: what is not wanted is deleted afterwards), and the dialog says what
 * was added and what was not, and why.
 */
export function ImportResume({ variant = 'primary', label = 'Import a resume' }: Props) {
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
      setPhase({ name: 'done', report: report(out.result) })
    } else {
      setPhase({ name: 'failed', message: out.message })
    }
  }

  const sending = phase.name === 'sending'

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <FileUp size={16} aria-hidden="true" />
        {label}
      </Button>

      <Modal open={open} onClose={close} title="Import a resume" className="max-w-lg">
        <div className="flex flex-col gap-4 p-5">
          {phase.name === 'done' ? (
            <>
              <Alert variant="success">{phase.report.headline}</Alert>
              {phase.report.notes.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
                  {phase.report.notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              )}
              <div className="flex justify-end">
                <Button variant="primary" onClick={close}>See my library</Button>
              </div>
            </>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
            >
              <div className="flex flex-col gap-1">
                <label htmlFor={inputId} className="text-sm font-semibold">Your resume (PDF, {IMPORT_MAX_MB} MB at most)</label>
                <input
                  id={inputId}
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={sending}
                  aria-invalid={problem ? true : undefined}
                  onChange={(e) => pick(e.target.files?.[0] ?? null)}
                  className={cn(
                    'block w-full cursor-pointer rounded-control border-2 border-ink bg-surface p-2 text-sm',
                    'file:mr-3 file:cursor-pointer file:rounded-control file:border-2 file:border-ink file:bg-accent file:px-3 file:py-1 file:font-semibold file:text-ink',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    focusRing,
                  )}
                />
              </div>
              <p className="text-xs text-ink-muted">
                {importNotice()}{' '}
                <a href="/privacy#import" target="_blank" rel="noopener" className="underline underline-offset-2">Privacy policy</a>
              </p>
              {problem && <Alert>{problem}</Alert>}
              {phase.name === 'failed' && <Alert>{phase.message}</Alert>}
              {sending && (
                <p role="status" className="flex items-center gap-2 text-sm font-semibold">
                  <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Reading your resume… this takes about 10 seconds.
                </p>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={close}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={!file || !!problem || sending}>
                  {phase.name === 'failed' ? 'Try again' : 'Import'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  )
}
