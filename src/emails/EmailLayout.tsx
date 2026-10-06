import { Body, Container, Head, Html, Link, Preview, Section, Text } from 'react-email'
import type { CSSProperties, ReactNode } from 'react'
import { emailTheme as t } from './theme'

const c = t.colors

/** Styles shared by every mail, from the theme only. */
export const mailStyles = {
  heading: { margin: '0 0 12px', fontSize: '22px', lineHeight: '1.3', fontWeight: 800, color: c.ink },
  paragraph: { margin: '0 0 24px', fontSize: '15px', lineHeight: '1.5', color: c.ink },
  small: { margin: '16px 0 0', fontSize: '13px', lineHeight: '1.5', color: c['ink-muted'] },
  link: { color: c.ink, textDecoration: 'underline', wordBreak: 'break-all' },
  button: {
    display: 'inline-block',
    padding: '12px 18px',
    backgroundColor: c.accent,
    color: c.ink,
    border: t.border,
    borderRadius: t.radius,
    boxShadow: t.shadow,
    fontSize: '15px',
    fontWeight: 700,
    textDecoration: 'none',
  },
} satisfies Record<string, CSSProperties>

/**
 * The frame of every mail: the page colour, a white card with the ink stroke
 * and hard shadow, the name on top, a short footer. `preview` is the line mail
 * apps show next to the subject.
 */
export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: '24px 12px', backgroundColor: c.canvas, fontFamily: t.font, color: c.ink }}>
        <Container style={{ maxWidth: '520px', backgroundColor: c.surface, border: t.border, borderRadius: t.radius, boxShadow: t.shadow }}>
          <Section style={{ padding: '24px' }}>
            <Text style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800 }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', marginRight: '8px', backgroundColor: c.accent, border: t.border, borderRadius: '2px', verticalAlign: 'middle' }} />
              FastResume
            </Text>
            {children}
          </Section>
        </Container>
        <Text style={{ ...mailStyles.small, textAlign: 'center' }}>
          FastResume, free and open source ·{' '}
          <Link href="https://fastresume.tech" style={mailStyles.link}>fastresume.tech</Link>
        </Text>
      </Body>
    </Html>
  )
}
