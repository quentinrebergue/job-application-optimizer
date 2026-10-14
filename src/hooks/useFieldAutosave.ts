'use client'

import { useEffect, useRef, useState } from 'react'
import { PendingSaves } from '@/lib/pending-saves'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const SAVE_DELAY_MS = 800

interface Options<V extends Record<string, string>> {
  initial: V
  /** Saves one field; throws to report a failure. */
  save: (field: keyof V & string, value: string) => Promise<void>
  /** A message when the value must not be saved (e.g. a required field left empty). */
  validate?: (field: keyof V & string, value: string) => string | undefined
}

/**
 * Form fields that save themselves 0.8 s after the user stops typing, one
 * request per field. A field that fails `validate` shows its message and is
 * not saved. Same behaviour as the offer of a job. Leaving (a dialog closed,
 * another page) saves what was typed in the last 0.8 s instead of dropping it.
 */
export function useFieldAutosave<V extends Record<string, string>>({ initial, save, validate }: Options<V>) {
  const [values, setValues] = useState<V>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof V, string>>>({})
  const [state, setState] = useState<SaveState>('idle')
  const [failure, setFailure] = useState<string | null>(null)
  const pending = useRef(new PendingSaves<keyof V & string>())
  const inFlight = useRef(0)
  // The latest `save`, for the one made on leaving (the one of the first render would hold old values).
  const saveRef = useRef(save)
  useEffect(() => { saveRef.current = save })

  useEffect(() => {
    const waiting = pending.current
    return () => waiting.flush((field, value) => { void saveRef.current(field, value).catch(() => {}) })
  }, [])

  async function run(field: keyof V & string, value: string) {
    inFlight.current += 1
    try {
      await save(field, value)
      setFailure(null)
      inFlight.current -= 1
      if (inFlight.current === 0 && !pending.current.waiting) setState('saved')
    } catch (err) {
      inFlight.current -= 1
      setFailure(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setState('error')
    }
  }

  function edit(field: keyof V & string, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    pending.current.cancel(field)

    const message = validate?.(field, value)
    setErrors((e) => ({ ...e, [field]: message }))
    if (message) return

    setState('saving')
    pending.current.schedule(field, value, SAVE_DELAY_MS, (f, v) => { void run(f, v) })
  }

  return { values, errors, state, failure, edit }
}
