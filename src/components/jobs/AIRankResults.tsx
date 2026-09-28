'use client'

import { ChevronDown, ChevronUp, Tag, Sparkles, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import type { AIAnalysisResult } from '@/types/job'

interface AIRankResultsProps {
  result: AIAnalysisResult
}

export function AIRankResults({ result }: AIRankResultsProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    experiences: true,
    projects: true,
    skills: true,
    education: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const EntityScore = ({ score }: { score: number }) => {
    let bgColor = 'bg-red-100'
    let textColor = 'text-red-700'
    if (score >= 80) {
      bgColor = 'bg-green-100'
      textColor = 'text-green-700'
    } else if (score >= 60) {
      bgColor = 'bg-blue-100'
      textColor = 'text-blue-700'
    } else if (score >= 40) {
      bgColor = 'bg-amber-100'
      textColor = 'text-amber-700'
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${bgColor} ${textColor}`}>
        {score}%
      </span>
    )
  }

  const TypeSection = ({ type, label, recommendedIds }: { type: 'experiences' | 'projects' | 'skills' | 'education'; label: string; recommendedIds?: string[] }) => {
    const entities = result.entities_by_type[type]
    const isExpanded = expandedSections[type]

    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(type)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{label}</span>
            <span className="text-sm text-slate-500">({entities.length})</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        {isExpanded && entities.length > 0 && (
          <div className="border-t border-slate-200 divide-y divide-slate-100">
            {entities.map((entity) => {
              const isRecommended = recommendedIds?.includes(entity.id)
              return (
                <div key={entity.id} className={`px-4 py-3 transition-colors ${isRecommended ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{entity.name}</p>
                        {isRecommended && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full">
                            <Sparkles className="w-3 h-3" />
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{entity.reason}</p>
                    </div>
                    <EntityScore score={entity.score} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {isExpanded && entities.length === 0 && (
          <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            No matches found
          </div>
        )}
      </div>
    )
  }

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
