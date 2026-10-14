'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  /** What is deleted, for assistive technology: "Delete Sales Assistant". */
  name: string
  onConfirm: () => void
  busy?: boolean
}

/** How long the button waits for the second press before it goes back to "Delete". */
const ARMED_MS = 4000

/**
 * Deleting takes two presses on the same button, so no question has to be read and no other control reached:
 * "Delete" turns into "Sure?" in place, and goes back by itself if nothing follows.
 */
export function DeleteButton({ name, onConfirm, busy = false }: Props) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), ARMED_MS)
    return () => clearTimeout(timer)
  }, [armed])

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        disabled={busy}
        aria-label={armed ? `Sure? Delete ${name}` : `Delete ${name}`}
        onClick={() => {
          if (!armed) return setArmed(true)
          setArmed(false)
          onConfirm()
        }}
        onBlur={() => setArmed(false)}
        // The same width in both states: the second press lands where the first did.
        className="min-w-24"
      >
        <Trash2 size={14} aria-hidden="true" />
        {busy ? 'Deleting…' : armed ? 'Sure?' : 'Delete'}
      </Button>
      <span role="status" className="sr-only">{armed ? 'Press again to delete.' : ''}</span>
    </>
  )
}
