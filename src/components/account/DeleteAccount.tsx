'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/components/ui/Alert'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerTitle } from '@/components/ui/Drawer'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'

/** The delete button and its drawer: the user types the email of the account again and gives the password, then the account goes. */
export function DeleteAccount({ email }: { email: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const matches = typed.trim().toLowerCase() === email.toLowerCase()

  function change(next: boolean) {
    setOpen(next)
    if (!next) {
      setTyped('')
      setPassword('')
      setError(null)
    }
  }

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: typed, password }),
      })
      if (res.ok) {
        // The cookie is gone: the visitor lands on the landing page, and what the router kept is dropped.
        router.replace('/')
        router.refresh()
        return
      }
      const body = await res.json().catch(() => null)
      setError(body?.error ?? 'The account could not be deleted. Try again.')
    } catch {
      setError('The account could not be deleted. Check your connection and try again.')
    }
    setPending(false)
  }

  return (
    <>
      <Button variant="danger" onClick={() => change(true)}>Delete my account</Button>
      <Drawer open={open} onOpenChange={change}>
        <DrawerContent>
          <DrawerTitle>Delete your account?</DrawerTitle>
          <DrawerDescription>
            Your profile, library, jobs and resume settings are deleted now, and cannot be recovered. A copy remains in the
            daily backups for up to 7 days, then disappears. To keep a copy of your data, download it first.
          </DrawerDescription>
          <form
            className="flex flex-col gap-field"
            onSubmit={(e) => {
              e.preventDefault()
              if (matches && password && !pending) confirm()
            }}
          >
            <Field label={`Type ${email} to confirm`}>
              <Input
                type="email"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </Field>
            <Field label="Your password">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && <Alert>{error}</Alert>}
            <DrawerFooter>
              <DrawerClose className={buttonClasses({ variant: 'secondary' })}>Cancel</DrawerClose>
              <Button type="submit" variant="danger" disabled={!matches || !password || pending}>
                {pending ? 'Deleting…' : 'Delete everything'}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  )
}
