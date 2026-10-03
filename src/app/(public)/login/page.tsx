import { LoginForm } from '@/components/auth/LoginForm'
import { returnToFrom, toSearchParams } from '@/lib/auth/return-to'

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = toSearchParams(await searchParams)
  return <LoginForm returnTo={returnToFrom(params)} query={params.toString()} />
}
