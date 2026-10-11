'use client'

import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'

/** Current password, new password. The other devices are signed out; this one stays signed in. */
export function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    setPending(true)
    setError(null)
    setDone(false)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      if (res.ok) {
        setCurrent('')
        setNext('')
        setDone(true)
      } else {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'The password could not be changed. Try again.')
      }
    } catch {
      setError('The password could not be changed. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="flex w-full max-w-sm flex-col items-start gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (current && next && !pending) submit()
      }}
    >
      <Field label="Current password" className="w-full">
        <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label="New password" hint="At least 8 characters, a letter and a digit." className="w-full">
        <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Button type="submit" variant="secondary" disabled={!current || !next || pending}>
        {pending ? 'Changing…' : 'Change my password'}
      </Button>
      {error && <Alert>{error}</Alert>}
      {done && <Alert variant="success">Password changed. Your other devices were signed out.</Alert>}
    </form>
  )
}
