'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'

interface Props {
  entityIds: string[]
}

export function GeneratePdfButton({ entityIds }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function generate() {
    setStatus('loading')
    setErrorMsg('')
    const res = await fetch('/api/resume/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: '__preview__', entityIds }),
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.pdf'
      a.click()
      URL.revokeObjectURL(url)
      setStatus('idle')
    } else {
      const json = await res.json().catch(() => ({}))
      setErrorMsg(json.error ?? 'Generation failed. Is pdflatex installed?')
      setStatus('error')
    }
  }

  return (
    <div>
      <button
        onClick={generate}
        disabled={status === 'loading' || entityIds.length === 0}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {status === 'loading' ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <FileDown size={15} />
        )}
        {status === 'loading' ? 'Generating…' : 'Generate PDF'}
      </button>
      {status === 'error' && errorMsg && (
        <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
      )}
    </div>
  )
}
