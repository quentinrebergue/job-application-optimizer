import { describe, it, expect } from 'vitest'
import type { AIAnalysisResult } from '@/types/job'
import { formatAnswer } from './show'

const entry = (id: string, name: string, level: 0 | 1 | 2 | 3, rank: number, reason = '') => ({ id, type: 'experience' as const, name, level, rank, reason })

const analysis = {
  ats_tags: ['C++', 'RTOS'],
  entities_by_type: {
    experiences: [entry('e1', 'Firmware', 3, 1, 'C++ on Cortex-M'), entry('e2', 'Web', 0, 2), entry('e3', 'Teaching', 2, 3)],
    projects: [], skills: [], education: [],
  },
  recommended_experience_ids: ['e1', 'e3'],
  recommended_project_ids: [], recommended_skill_ids: [],
  recommended_skill_tags: {},
  suggested_new_skills: [{ name: 'Rust', category: 'Languages', level: 'intermediate', tags: [], reason: 'asked' }],
  suggested_new_skill_tags: [],
} as unknown as AIAnalysisResult

describe('formatAnswer', () => {
  const text = formatAnswer(analysis, { experiences: ['e1', 'e2'], projects: [], skills: [] })

  it('lists every entry in order with its level and reason', () => {
    expect(text).toContain(' 1. [3] *+ Firmware  C++ on Cortex-M')
    expect(text).toContain(' 2. [0]  - Web')
    expect(text).toContain(' 3. [2] *  Teaching')
  })

  it('marks what the app recommends and what was expected', () => {
    expect(text).toMatch(/\[3\] \*\+ Firmware/) // recommended and expected
    expect(text).toMatch(/\[0\]  - Web/) // expected, not recommended
    expect(text).toMatch(/\[2\] \*  Teaching/) // recommended, not expected
  })

  it('shows the ATS tags and the suggestions', () => {
    expect(text).toContain('ATS tags: C++, RTOS')
    expect(text).toContain('Rust (Languages): asked')
  })
})
