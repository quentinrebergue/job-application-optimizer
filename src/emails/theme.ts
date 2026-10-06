// The brand for mails. Mail clients ignore CSS variables and classes, so mails
// need the values themselves: they are written here once, named after the
// tokens of src/app/globals.css, and theme.test.ts fails if they drift apart.

export const emailColors = {
  canvas: '#ffe9c7',
  surface: '#ffffff',
  ink: '#1a1514',
  'ink-muted': '#4a413c',
  accent: '#ff4d50',
} as const

export const emailTheme = {
  colors: emailColors,
  /** --radius-control (0.3125rem): written in px, rem is unreliable in mail clients */
  radius: '5px',
  /** The 2px ink stroke of every sticker-like element */
  border: `2px solid ${emailColors.ink}`,
  /** --shadow-hard; clients that ignore box-shadow just show the stroke */
  shadow: `4px 4px 0 0 ${emailColors.ink}`,
  /** DM Sans is not installed in mail clients: close system fonts first */
  font: "'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const
