'use client'

import { useState } from 'react'
import type { AIAnalysisResult } from '@/types/job'
import { fetchJson } from '@/lib/http'

// One AI for everyone; it moves to the OVH AI Endpoints with #44. Until then the
// interface keeps the provider it used by default.
const PROVIDER = 'claude'

/** Asks the AI to score the library against this job (POST /api/jobs/[id]/rank). */
export function useAiRanking(jobId: string, onRankingComplete?: (result: AIAnalysisResult) => void) {
  const [ranking, setRanking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function rank() {
    setRanking(true)
    setError(null)
    try {
      const result = await fetchJson<AIAnalysisResult>(`/api/jobs/${jobId}/rank`, { method: 'POST', json: { provider: PROVIDER } })
      onRankingComplete?.(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ranking failed. Try again.')
    } finally {
      setRanking(false)
    }
  }

  return { rank, ranking, error }
}
