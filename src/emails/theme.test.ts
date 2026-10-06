import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { emailColors, emailTheme } from './theme'

const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8')

function token(name: string): string | undefined {
  return css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim().toLowerCase()
}

describe('mail theme', () => {
  it.each(Object.entries(emailColors))('colour %s matches its token in globals.css', (name, value) => {
    expect(token(`color-${name}`)).toBe(value)
  })

  it('radius matches --radius-control', () => {
    expect(token('radius-control')).toBe(`${parseFloat(emailTheme.radius) / 16}rem`)
  })
})
