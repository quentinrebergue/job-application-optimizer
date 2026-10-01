'use client'

import { Tag, Lightbulb } from 'lucide-react'
import type { AIAnalysisResult } from '@/types/job'

interface AIRankResultsProps {
  result: AIAnalysisResult
}

export function AIRankResults({ result }: AIRankResultsProps) {
  return (
    <div className="space-y-6 py-6">
      {/* Summary Section */}
      <div className="bg-linear-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-2">AI Analysis Summary</h3>
        <p className="text-sm text-slate-700 mb-3">{result.summary}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Confidence:</span>
          <div className="flex-1 max-w-xs bg-slate-200 rounded-full h-2">
            <div
              className="bg-linear-to-r from-purple-500 to-blue-500 h-full rounded-full"
              style={{ width: `${result.confidence_score * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-900">{(result.confidence_score * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* ATS Tags */}
      {result.ats_tags.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            ATS Tags ({result.ats_tags.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.ats_tags.map((tag) => (
              <span key={tag} className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resume Tips */}
      {result.resume_tips && result.resume_tips.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-green-600" />
            Resume tips for this job
          </h3>
          <ul className="space-y-1.5">
            {result.resume_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-green-500 font-bold shrink-0">→</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-500 italic">
        ℹ️ Individual entity scores and reasoning are shown in the entity checklist below for convenience.
      </p>
    </div>
  )
}
