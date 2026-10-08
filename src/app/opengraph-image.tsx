import { ImageResponse } from 'next/og'

export const alt = 'FastResume: one job, one resume, three clicks'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// The preview card of a shared link. ImageResponse takes literal colours, so
// these are the tokens of globals.css written out (canvas, ink, accent, accent-strong).
const INK = '#1a1514'
const CANVAS = '#ffe9c7'
const ACCENT = '#ff4d50'
const ACCENT_STRONG = '#c4122f'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: CANVAS, color: INK, padding: 72, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, background: ACCENT, border: `4px solid ${INK}`, borderRadius: 8, boxShadow: `6px 6px 0 0 ${INK}` }} />
          <div style={{ fontSize: 44, fontWeight: 800 }}>FastResume</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 104, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>
          <div>One job. One resume.</div>
          <div style={{ color: ACCENT_STRONG }}>Three clicks.</div>
        </div>
        <div style={{ display: 'flex', fontSize: 32 }}>
          <div style={{ display: 'flex', background: '#ffffff', border: `4px solid ${INK}`, borderRadius: 8, padding: '10px 22px', boxShadow: `6px 6px 0 0 ${INK}`, fontWeight: 700 }}>
            Free · Not for profit · Hosted in France
          </div>
        </div>
      </div>
    ),
    size,
  )
}
