import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSessionUserId } from '@/lib/auth/session'
import { findUserById, type User } from '@/lib/data/users'

export const verifySession = cache(async (): Promise<{ userId: string }> => {
  const userId = await getSessionUserId()
  if (!userId) {
    // Not /login: a cookie that points at no session would loop with the proxy (#178).
    redirect('/session-expired')
  }
  return { userId }
})

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const userId = await getSessionUserId()
  if (!userId) return null
  return findUserById(userId)
})
