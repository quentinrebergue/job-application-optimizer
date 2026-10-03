'use client'

import { useState } from 'react'
import type { AIAnalysisResult } from '@/types/job'
import { Button } from '@/components/ui/Button'
import { fetchJson } from '@/lib/http'

// One AI for everyone; it moves to the OVH AI Endpoints with #44. Until then the
// interface keeps the provider it used by default.
const PROVIDER = 'claude'

interface AIRankButtonProps {
  jobId: string
  /** Label of the button, e.g. "Rank again" once a ranking exists */
  label?: string
  onRankingComplete?: (result: AIAnalysisResult) => void
}

/** Asks the AI to score the library against this job. */
export function AIRankButton({ jobId, label = 'Rank with AI', onRankingComplete }: AIRankButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRank() {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchJson<AIAnalysisResult>(`/api/jobs/${jobId}/rank`, { method: 'POST', json: { provider: PROVIDER } })
      onRankingComplete?.(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ranking failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button onClick={handleRank} disabled={loading}>{loading ? 'Ranking…' : label}</Button>
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  )
}
