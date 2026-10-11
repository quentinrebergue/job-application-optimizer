'use client'

import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'

/** New address and password. A link goes to the new address; the account changes address when it is opened. */
export function ChangeEmail() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function submit() {
    setPending(true)
    setError(null)
    setSentTo(null)
    try {
      const res = await fetch('/api/account/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const body = await res.json().catch(() => null)
      if (res.ok) {
        setSentTo(body?.email ?? email)
        setEmail('')
        setPassword('')
      } else {
        setError(body?.error ?? 'The address could not be changed. Try again.')
      }
    } catch {
      setError('The address could not be changed. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="flex w-full max-w-sm flex-col items-start gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (email && password && !pending) submit()
      }}
    >
      <Field label="New email address" className="w-full">
        <Input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Your password" className="w-full">
        <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" variant="secondary" disabled={!email || !password || pending}>
        {pending ? 'Sending…' : 'Change my email'}
      </Button>
      {error && <Alert>{error}</Alert>}
      {sentTo && (
        <Alert variant="info">
          We sent a link to {sentTo}. Your address changes when you open it (it is valid for 24 hours).
        </Alert>
      )}
    </form>
  )
}
