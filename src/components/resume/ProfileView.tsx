'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ResumeProfile } from '@/schemas/resume-profile'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EditToggle } from '@/components/ui/EditToggle'
import { fetchJson } from '@/lib/http'
import { profileRows } from '@/lib/import-resume'
import { ResumeDefaultsEditor } from './ResumeDefaultsEditor'

interface Props {
  /** What the resume of an import says where the profile already said something else: field -> value, offered with "Use this". */
  found?: Record<string, string>
  /** The row above the profile, given the Edit / Done button to put in it (a title on its left, for instance) and whether the form is open. */
  header: (toggle: React.ReactNode, editing: boolean) => React.ReactNode
}

/** The two long texts: their value goes under the label, over the whole width, instead of beside it. */
const LONG_FIELDS = new Set<string>(['resume_title', 'profile_text'])

/**
 * The profile read as text, which takes little room; Edit turns it into the form (every field saves itself) and
 * becomes Done, and the text then shows what was saved. A field with nothing says which one ("No phone found").
 */
export function ProfileView({ found = {}, header }: Props) {
  const [profile, setProfile] = useState<ResumeProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [other, setOther] = useState(found)
  const [using, setUsing] = useState<string | null>(null)

  const load = useCallback(() => {
    fetchJson<ResumeProfile>('/api/resume/defaults')
      .then((loaded) => { setProfile(loaded); setError(null) })
      .catch((err) => setError(err instanceof Error ? err.message : 'Profile not loaded.'))
  }, [])
  useEffect(load, [load])

  async function use(field: string) {
    if (!profile) return
    setUsing(field)
    try {
      // The API replaces the whole profile: every field is sent, with this one changed.
      const next = { ...profile, [field]: other[field] }
      await fetchJson('/api/resume/defaults', { method: 'PUT', json: next })
      setProfile(next)
      setOther((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== field)))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile not saved.')
    } finally {
      setUsing(null)
    }
  }

  const toggle = (
    <EditToggle
      editing={editing}
      name="the profile"
      onToggle={() => {
        // Back to the text: read it again, it holds what was saved.
        if (editing) load()
        setEditing(!editing)
      }}
    />
  )

  return (
    <div className="flex flex-col gap-stack">
      {header(toggle, editing)}
      {error && <Alert>Profile not loaded: {error}</Alert>}
      {editing ? (
        <ResumeDefaultsEditor inline />
      ) : profile ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-inline gap-y-2 text-small">
          {profileRows(profile).map((row) => (
            <div key={row.key} className="contents">
              <dt className={LONG_FIELDS.has(row.key) ? 'col-span-2 mt-1 font-semibold' : 'font-semibold'}>{row.label}</dt>
              <dd className={LONG_FIELDS.has(row.key) ? 'col-span-2 flex flex-col gap-1' : 'flex flex-col gap-1'}>
                <span className="whitespace-pre-wrap break-words">{row.value ?? <span className="text-ink-muted">{row.missing}</span>}</span>
                {other[row.key] && (
                  <span className="flex flex-wrap items-center gap-2 text-ink-muted">
                    <span className="whitespace-pre-wrap break-words">In your resume: {other[row.key]}</span>
                    <Button variant="secondary" size="sm" onClick={() => use(row.key)} disabled={using === row.key} aria-label={`Use the ${row.label.toLowerCase()} of your resume`}>
                      Use this
                    </Button>
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : !error ? (
        <p className="text-small text-ink-muted">Loading your profile…</p>
      ) : null}
    </div>
  )
}
