// SMTP providers, in the order they are tried: the primary (Brevo) then an
// optional fallback (Scaleway), see #124. Read from the environment, so changing
// provider is a configuration change, not a code change.

export interface SmtpProvider {
  name: 'primary' | 'fallback'
  host: string
  port: number
  user: string
  password: string
}

type Env = Record<string, string | undefined>

function provider(env: Env, name: SmtpProvider['name'], prefix: string): SmtpProvider | null {
  const host = env[`${prefix}HOST`]
  const user = env[`${prefix}USER`]
  const password = env[`${prefix}PASSWORD`]
  if (!host || !user || !password) return null
  return { name, host, port: Number(env[`${prefix}PORT`] ?? 587), user, password }
}

/** The configured providers, primary first; empty when none is set. */
export function smtpProviders(env: Env = process.env): SmtpProvider[] {
  return [provider(env, 'primary', 'SMTP_'), provider(env, 'fallback', 'SMTP_FALLBACK_')].filter(
    (p): p is SmtpProvider => p !== null,
  )
}

/** Sender of every mail, e.g. "FastResume <no-reply@fastresume.tech>". */
export function emailFrom(env: Env = process.env): string {
  return env.EMAIL_FROM ?? 'FastResume <no-reply@fastresume.tech>'
}

/** Public address of the app, for the links in mails (no trailing slash). */
export function appUrl(env: Env = process.env): string {
  return (env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
}
