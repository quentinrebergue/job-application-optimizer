import { AuthForm } from '@/components/auth/AuthForm'
import { returnToFrom, toSearchParams } from '@/lib/auth/return-to'

export const metadata = { title: 'Sign up' }

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const params = toSearchParams(await searchParams)
  return <AuthForm mode="signup" returnTo={returnToFrom(params)} query={params.toString()} />
}
