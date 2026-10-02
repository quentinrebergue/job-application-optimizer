'use client'

import { useEffect, useState } from 'react'
import type { TemplateInfo } from '@/schemas/resume-template'

/** Loads the templates the renderer service offers (once per mount). */
export function useTemplates() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/resume/templates')
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Could not load the resume templates.')
        return body.templates as TemplateInfo[]
      })
      .then((list) => {
        if (!cancelled) setTemplates(list)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { templates, error }
}
