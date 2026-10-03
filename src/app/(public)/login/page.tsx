import { AuthForm } from '@/components/auth/AuthForm'
import { returnToFrom, toSearchParams } from '@/lib/auth/return-to'

export const metadata = { title: 'Log in' }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = toSearchParams(await searchParams)
  return <AuthForm mode="login" returnTo={returnToFrom(params)} query={params.toString()} />
}
