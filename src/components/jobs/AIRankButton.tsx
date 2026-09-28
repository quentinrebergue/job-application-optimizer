'use client'

import { useState } from 'react'
import { Zap, Loader, AlertCircle } from 'lucide-react'
import type { AIAnalysisResult } from '@/types/job'

type AIProvider = 'gemini' | 'claude'

interface AIRankButtonProps {
  jobId: string
  onRankingComplete?: (result: AIAnalysisResult) => void
  compact?: boolean
}

function ProviderToggle({
  provider,
  onChange,
  disabled,
}: {
  provider: AIProvider
  onChange: (p: AIProvider) => void
  disabled: boolean
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 p-0.5 text-xs font-medium">
      {(['claude', 'gemini'] as const).map((p) => (
        <button
          key={p}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p)}
          className={`rounded-md px-2 py-1 capitalize transition-colors disabled:opacity-60 ${
            provider === p ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

export function AIRankButton({ jobId, onRankingComplete, compact }: AIRankButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<AIProvider>('claude')

  const handleRank = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/jobs/${jobId}/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to rank job')
      }

      const result: AIAnalysisResult = await response.json()
      onRankingComplete?.(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <>
        <ProviderToggle provider={provider} onChange={setProvider} disabled={loading} />
        <button
          onClick={handleRank}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 transition-opacity"
          style={{ background: '#4f46e5' }}
        >
          {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          {loading ? 'Analyzing…' : 'AI Rank'}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </>
    )
  }

  return (
    <div className="space-y-2">
      <ProviderToggle provider={provider} onChange={setProvider} disabled={loading} />
      <button
        onClick={handleRank}
        disabled={loading}
        style={{
          background: loading ? '#4f46e5' : '#4f46e5',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontWeight: 'bold',
          border: '2px solid #4338ca',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.75 : 1,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s',
        }}
      >
        {loading ? (
          <>
            <Loader className="w-6 h-6 animate-spin" />
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <Zap className="w-6 h-6" />
            <span>AI Rank Job</span>
          </>
        )}
      </button>
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
