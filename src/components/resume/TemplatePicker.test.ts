import { describe, it, expect } from 'vitest'
import type { TemplateInfo } from '@/schemas/resume-template'
import { isOptionOffered } from './TemplatePicker'

const template = {
  id: 'classic',
  options: {
    fontSize: { type: 'number', min: 8, max: 12, default: 10.5 },
    fitToPage: { type: 'enum', values: ['yes', 'no'], default: 'yes' },
    datePlacement: { type: 'enum', values: ['inline', 'right'], default: 'inline' },
    accentColor: { type: 'color', default: '#1a73e8' },
  },
} as unknown as TemplateInfo

describe('isOptionOffered', () => {
  it('hides the font size while the page is fitted (the default), and offers it again when it is not', () => {
    expect(isOptionOffered('fontSize', template, {})).toBe(false)
    expect(isOptionOffered('fontSize', template, { fitToPage: 'yes' })).toBe(false)
    expect(isOptionOffered('fontSize', template, { fitToPage: 'no' })).toBe(true)
  })

  it('offers the other options, and never the ones the app fixes', () => {
    expect(isOptionOffered('fitToPage', template, {})).toBe(true)
    expect(isOptionOffered('accentColor', template, {})).toBe(true)
    expect(isOptionOffered('datePlacement', template, {})).toBe(false)
  })

  it('keeps the font size for a template that cannot fit the page', () => {
    const plain = { id: 'x', options: { fontSize: template.options.fontSize } } as unknown as TemplateInfo
    expect(isOptionOffered('fontSize', plain, {})).toBe(true)
  })
})
