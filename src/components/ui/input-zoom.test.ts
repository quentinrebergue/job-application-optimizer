import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { controlClasses } from './Input'

// iOS Safari zooms the page when a text field under 16 px takes the focus (and does not zoom back). Every field of the
// app gets its text size from `controlClasses`; this test keeps that true.

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return sources(p)
    return e.name.endsWith('.tsx') && !e.name.includes('.test.') ? [p] : []
  })
}

describe('the text size of the fields', () => {
  it('is 16 px on a phone, in the one class every field takes', () => {
    expect(controlClasses.split(' ')).toContain('text-body')
    expect(controlClasses.split(' ')).not.toContain('text-small')
    // ...and the smaller size only from the width of a computer, where nothing zooms.
    expect(controlClasses.split(' ')).toContain('md:text-small')
  })

  it('has no raw field that would miss the rule', () => {
    // Fields written with the HTML tags instead of Input / Textarea / Select. Each is reviewed here: it takes
    // `controlClasses` or is not a text field (a hidden value, a checkbox, a file, a colour, which do not zoom).
    const REVIEWED = new Set([
      'src/components/resume/TemplatePicker.tsx', // selects with CONTROL = controlClasses + h-10; a colour input
      'src/components/entities/ImportResume.tsx', // a file input
      'src/components/jobs/resume-config/EntityRow.tsx', // a checkbox
      'src/components/auth/AuthForm.tsx', // hidden
      'src/components/auth/ResetPasswordForm.tsx', // hidden
      'src/app/(public)/verify-email/change/page.tsx', // hidden
    ])
    const raw = sources('src')
      .filter((f) => !f.endsWith('ui/Input.tsx'))
      .filter((f) => /<(input|textarea|select)\b/.test(fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')))
      .filter((f) => !f.includes('SelectMenu'))
    expect(raw.filter((f) => !REVIEWED.has(f))).toEqual([])
    // The two selects of the template picker really use the shared class.
    expect(fs.readFileSync('src/components/resume/TemplatePicker.tsx', 'utf8')).toMatch(/const CONTROL = cn\(controlClasses/)
  })
})
