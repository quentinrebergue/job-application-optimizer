'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

export default function TemplatesPage() {
  const [mainTemplate, setMainTemplate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('main')

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const res = await fetch('/api/resume/template')
        if (!res.ok) throw new Error('Failed to load template')
        const data = (await res.json()) as { content: string }
        setMainTemplate(data.content)
      } catch (error) {
        console.error('Error loading template:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTemplate()
  }, [])

  const handleSave = async () => {
    try {
      const res = await fetch('/api/resume/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: mainTemplate }),
      })
      if (!res.ok) throw new Error('Failed to save template')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving template:', error)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">LaTeX Templates Editor</h1>

        <div className="bg-white rounded-lg shadow">
          {/* Tab Navigation */}
          <div className="border-b flex">
            {['main', 'sections', 'entities'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'main' && 'Main Template'}
                {tab === 'sections' && 'Section Templates'}
                {tab === 'entities' && 'Entity Templates'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'main' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Main LaTeX Template (template.tex)
                  </label>
                  <textarea
                    value={mainTemplate}
                    onChange={(e) => setMainTemplate(e.target.value)}
                    className="w-full h-96 p-4 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="LaTeX template content..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    You can modify font sizes, margins, spacing, and all LaTeX styling here.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    Save Template
                  </Button>
                  {saved && <span className="text-green-600 font-medium">✓ Saved!</span>}
                </div>
              </div>
            )}

            {activeTab === 'sections' && (
              <div className="text-gray-600 py-8 text-center">
                <p>Section templates (experience.tex, projects.tex, etc.) will be editable here soon.</p>
              </div>
            )}

            {activeTab === 'entities' && (
              <div className="text-gray-600 py-8 text-center">
                <p>Entity templates will be editable here soon.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
