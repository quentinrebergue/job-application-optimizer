'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup } from '@/app/actions/auth'

// `returnTo` is the page to land on afterwards; `query` keeps it when switching
// between login and signup.
export function SignupForm({ returnTo, query }: { returnTo: string; query: string }) {
  const [state, action, pending] = useActionState(signup, undefined)

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-slate-900 mb-6">Create an account</h1>
        <form action={action} className="space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {state?.errors?.email && <p className="text-xs text-red-600 mt-1">{state.errors.email[0]}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-slate-600 mb-1">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {state?.errors?.password && (
              <ul className="text-xs text-red-600 mt-1 space-y-0.5">
                {state.errors.password.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
          </div>
          {state?.message && <p className="text-sm text-red-600">{state.message}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {pending ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="text-sm text-slate-500 mt-4">
          Already have an account? <Link href={query ? `/login?${query}` : '/login'} className="text-blue-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
