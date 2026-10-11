'use client'

import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'

/**
 * Downloads the JSON file of the user's data after the password is given. Fetched, so that a refusal (wrong
 * password, too many attempts) is shown, not saved as a file.
 */
export function ExportButton() {
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/account/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'The export failed. Try again.')
        return
      }
      const filename = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'fastresume-export.json'
      const url = URL.createObjectURL(await res.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
      setPassword('')
    } catch {
      setError('The export failed. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="flex w-full max-w-sm flex-col items-start gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (password && !pending) download()
      }}
    >
      <Field label="Your password" className="w-full">
        <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" variant="secondary" disabled={!password || pending}>
        {pending ? 'Preparing…' : 'Download my data'}
      </Button>
      {error && <Alert>{error}</Alert>}
    </form>
  )
}
