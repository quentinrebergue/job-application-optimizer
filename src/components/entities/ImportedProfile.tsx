'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ResumeProfile } from '@/schemas/resume-profile'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { ResumeDefaultsEditor } from '@/components/resume/ResumeDefaultsEditor'
import { fetchJson } from '@/lib/http'
import { profileRows } from '@/lib/import-resume'
import { EditToggle, SectionTitle } from './ImportedParts'

/**
 * The profile as the import left it, read as text (a field with nothing says so); Edit turns it into the editor of
 * the Resume page and becomes Done, and the text shows what was saved.
 */
export function ImportedProfile({ found }: { found: Record<string, string> }) {
  const [profile, setProfile] = useState<ResumeProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  // What the resume says where the profile already said something else: kept aside until the user picks one.
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

  return (
    <section aria-label="Profile" className="flex flex-col gap-heading">
      <SectionTitle>Profile</SectionTitle>
      <div className="flex flex-col gap-stack rounded-control border-2 border-ink bg-surface p-card">
        <div className="flex justify-end">
          <EditToggle
            editing={editing}
            name="the profile"
            onToggle={() => {
              // Back to the text: read it again, it holds what was saved.
              if (editing) load()
              setEditing(!editing)
            }}
          />
        </div>
        {error && <Alert>Profile not loaded: {error}</Alert>}
        {editing ? (
          <ResumeDefaultsEditor inline />
        ) : (
          profile && (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-inline gap-y-2 text-small">
              {profileRows(profile).map((row) => (
                <div key={row.label} className="contents">
                  <dt className="font-semibold">{row.label}</dt>
                  <dd className="flex flex-col gap-1">
                    <span className="whitespace-pre-wrap break-words">{row.value ?? <span className="text-ink-muted">No data found</span>}</span>
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
          )
        )}
      </div>
    </section>
  )
}
