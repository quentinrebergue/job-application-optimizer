'use client'

import { useEffect, useState } from 'react'

/**
 * The value, kept for `ms` after it goes away: what a dialog shows while it slides out. `undefined` once the time is
 * over; a new value replaces the old one at once.
 */
export function useHeld<T>(value: T | undefined, ms: number): T | undefined {
  const [held, setHeld] = useState<T | undefined>(value)
  const [seen, setSeen] = useState<T | undefined>(value)
  const [expired, setExpired] = useState(false)

  // A new value is kept at once (state adjusted while rendering, before anything is drawn).
  if (value !== seen) {
    setSeen(value)
    if (value !== undefined) {
      setHeld(value)
      setExpired(false)
    }
  }

  useEffect(() => {
    if (value !== undefined) return
    const timer = setTimeout(() => setExpired(true), ms)
    return () => clearTimeout(timer)
  }, [value, ms])

  if (value !== undefined) return value
  return expired ? undefined : held
}
