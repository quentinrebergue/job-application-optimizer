// The Content Security Policy of the pages (#205): which origins may load what, so that a script
// someone manages to inject into a page cannot run, and the page cannot be framed.
//
// A fresh nonce for each request goes in the policy; Next.js reads it from the request header and
// puts it on its own scripts and styles (see node_modules/next/dist/docs/01-app/02-guides/
// content-security-policy.md). That needs every page to be rendered at the request, not built
// ahead: the root layout calls `connection()` for that.
//
// What the app loads is all its own: scripts, styles, the font (self-hosted by next/font), images.
// So the policy has no external origin. Two deliberate openings:
//  - `style-src-attr 'unsafe-inline'`: two components set a style attribute (the tabs' corners, the
//    cursor of the landing demo). It only concerns attributes; scripts and style *elements* keep the
//    nonce, and nothing can be fetched from elsewhere (`default-src 'self'`), so there is no way
//    to carry data out through a style.
//  - in development only, `'unsafe-eval'` and inline styles, which React and the dev server need.
// `upgrade-insecure-requests` is left out: the ingress already sends HSTS, and it would break the
// local test of a production build over http.

export type CspMode = 'enforce' | 'report-only'

/** CSP_MODE=report-only reports what the policy would block without blocking it (to try a change). */
export function cspMode(): CspMode {
  return process.env.CSP_MODE === 'report-only' ? 'report-only' : 'enforce'
}

export const cspHeaderName = (mode: CspMode) =>
  mode === 'report-only' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'

/** Where the browsers send a violation: logged, never stored (src/app/api/csp-report/route.ts). */
export const CSP_REPORT_PATH = '/api/csp-report'

export function newNonce(): string {
  return btoa(crypto.randomUUID())
}

export function buildCsp(nonce: string, { dev = false }: { dev?: boolean } = {}): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' ${dev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `report-uri ${CSP_REPORT_PATH}`,
  ]
  return directives.join('; ')
}
