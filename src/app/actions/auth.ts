'use server'

import { pool } from '@/lib/db'
import { redirect } from 'next/navigation'
import { createUser, findUserByEmail } from '@/lib/data/users'
import { verifyPassword } from '@/lib/auth/password'
import { createSession, deleteSession } from '@/lib/auth/session'
import { SignupSchema, LoginSchema } from '@/lib/validation/auth-schemas'

export type AuthFormState =
  | { errors?: { email?: string[]; password?: string[] }; message?: string }
  | undefined

export async function signup(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors }
  }

  const { email, password } = validated.data
  try {
    const user = await createUser(email, password)
    await createSession(user.id)
  } catch (err) {
    const isDuplicate = err instanceof Error && 'code' in err && err.code === '23505'
    return { message: isDuplicate ? 'Cet email est déjà utilisé.' : 'Une erreur est survenue.' }
  }

  redirect('/')
}

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

async function isRateLimited(email: string): Promise<boolean> {
  const result = await pool.query<{ count: number; reset_at: Date }>(
    `SELECT count, reset_at FROM login_attempts WHERE email = $1`,
    [email]
  )
  const row = result.rows[0]
  if (!row || row.reset_at < new Date()) return false
  return row.count >= MAX_ATTEMPTS
}

async function recordFailedAttempt(email: string): Promise<void> {
  const resetAt = new Date(Date.now() + WINDOW_MS)
  await pool.query(
    `INSERT INTO login_attempts (email, count, reset_at)
     VALUES ($1, 1, $2)
     ON CONFLICT (email) DO UPDATE SET
       count = CASE WHEN login_attempts.reset_at < now() THEN 1 ELSE login_attempts.count + 1 END,
       reset_at = CASE WHEN login_attempts.reset_at < now() THEN $2 ELSE login_attempts.reset_at END`,
    [email, resetAt]
  )
}

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors }
  }

  const { email, password } = validated.data

  if (await isRateLimited(email)) {
    return { message: 'Trop de tentatives. Réessaie dans 15 minutes.' }
  }

  const user = await findUserByEmail(email)
  const valid = user ? await verifyPassword(password, user.passwordHash) : false

  if (!user || !valid) {
    await recordFailedAttempt(email)
    return { message: 'Email ou mot de passe incorrect.' }
  }

  await createSession(user.id)
  redirect('/')
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/login')
}
