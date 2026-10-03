'use client'

import { useEffect, useRef, useState } from 'react'

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
 * not saved. Same behaviour as the offer of a job.
 */
export function useFieldAutosave<V extends Record<string, string>>({ initial, save, validate }: Options<V>) {
  const [values, setValues] = useState<V>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof V, string>>>({})
  const [state, setState] = useState<SaveState>('idle')
  const [failure, setFailure] = useState<string | null>(null)
  const timers = useRef<Partial<Record<keyof V, ReturnType<typeof setTimeout>>>>({})
  const inFlight = useRef(0)

  useEffect(() => {
    const pending = timers.current
    return () => { for (const t of Object.values(pending)) clearTimeout(t as ReturnType<typeof setTimeout>) }
  }, [])

  async function run(field: keyof V & string, value: string) {
    inFlight.current += 1
    try {
      await save(field, value)
      setFailure(null)
      inFlight.current -= 1
      if (inFlight.current === 0 && Object.keys(timers.current).length === 0) setState('saved')
    } catch (err) {
      inFlight.current -= 1
      setFailure(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setState('error')
    }
  }

  function edit(field: keyof V & string, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    const pending = timers.current[field]
    if (pending) clearTimeout(pending)
    delete timers.current[field]

    const message = validate?.(field, value)
    setErrors((e) => ({ ...e, [field]: message }))
    if (message) return

    setState('saving')
    timers.current[field] = setTimeout(() => {
      delete timers.current[field]
      void run(field, value)
    }, SAVE_DELAY_MS)
  }

  return { values, errors, state, failure, edit }
}
