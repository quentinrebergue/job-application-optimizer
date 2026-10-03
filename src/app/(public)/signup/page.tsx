import { SignupForm } from '@/components/auth/SignupForm'
import { returnToFrom, toSearchParams } from '@/lib/auth/return-to'

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const params = toSearchParams(await searchParams)
  return <SignupForm returnTo={returnToFrom(params)} query={params.toString()} />
}
