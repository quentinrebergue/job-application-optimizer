'use client'

import { useState } from 'react'
import type { AIAnalysisResult } from '@/types/job'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { fetchJson } from '@/lib/http'

type AIProvider = 'claude' | 'gemini'

interface AIRankButtonProps {
  jobId: string
  onRankingComplete?: (result: AIAnalysisResult) => void
}

/** Asks the AI to rank the library against this job, with a choice of provider. */
export function AIRankButton({ jobId, onRankingComplete }: AIRankButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<AIProvider>('claude')

  async function handleRank() {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchJson<AIAnalysisResult>(`/api/jobs/${jobId}/rank`, { method: 'POST', json: { provider } })
      onRankingComplete?.(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ranking failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <fieldset disabled={loading}>
        <Tabs
          label="AI provider"
          items={[{ value: 'claude', label: 'Claude' }, { value: 'gemini', label: 'Gemini' }]}
          value={provider}
          onChange={setProvider}
        />
      </fieldset>
      <Button variant="secondary" size="sm" onClick={handleRank} disabled={loading}>
        {loading ? 'Ranking…' : 'Rank with AI'}
      </Button>
      {error && <p role="alert" className="w-full text-xs font-semibold text-danger">{error}</p>}
    </div>
  )
}
