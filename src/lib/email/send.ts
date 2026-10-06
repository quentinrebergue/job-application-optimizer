import 'server-only'
import nodemailer from 'nodemailer'
import { emailFrom, smtpProviders, type SmtpProvider } from './providers'

export interface Email {
  to: string
  subject: string
  text: string
  html: string
}

/** Sends one mail through one provider; throws on failure. */
export type Transport = (provider: SmtpProvider, email: Email & { from: string }) => Promise<void>

const smtpTransport: Transport = async (provider, email) => {
  const transporter = nodemailer.createTransport({
    host: provider.host,
    port: provider.port,
    secure: provider.port === 465, // 587 starts in clear and upgrades with STARTTLS
    requireTLS: provider.port !== 465,
    auth: { user: provider.user, pass: provider.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
  await transporter.sendMail(email)
}

/**
 * Sends a mail through the first provider that accepts it: any error (quota
 * reached, outage, timeout) moves on to the next one. Without any provider,
 * outside production, the mail is printed in the server console instead.
 * Throws when every provider failed.
 */
export async function sendEmail(
  email: Email,
  { providers = smtpProviders(), transport = smtpTransport }: { providers?: SmtpProvider[]; transport?: Transport } = {},
): Promise<void> {
  const message = { ...email, from: emailFrom() }

  if (providers.length === 0) {
    if (process.env.NODE_ENV === 'production') throw new Error('No SMTP provider is configured.')
    console.info(`[email] to ${email.to}: ${email.subject}\n${email.text}`)
    return
  }

  const failures: string[] = []
  for (const provider of providers) {
    try {
      await transport(provider, message)
      return
    } catch (err) {
      failures.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`)
      console.error(`[email] ${provider.name} provider failed`, err)
    }
  }
  throw new Error(`Every mail provider failed (${failures.join('; ')})`)
}
