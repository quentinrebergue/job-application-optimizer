import { redirect } from 'next/navigation'
import { DeleteAccount } from '@/components/account/DeleteAccount'
import { ExportButton } from '@/components/account/ExportButton'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { page } from '@/components/ui/styles'
import { getCurrentUser, verifySession } from '@/lib/auth/dal'
import { cn } from '@/lib/cn'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Account' }

// Your data is yours (#104): a copy of everything, and the way out.
export default async function AccountPage() {
  await verifySession()
  const user = await getCurrentUser()
  if (!user) redirect('/session-expired')

  return (
    <div className={cn(page, 'max-w-3xl')}>
      <PageHeader title="Account" subtitle={user.email} />
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col items-start gap-3">
          <h2 className="text-lg font-extrabold tracking-tight">Your data</h2>
          <p className="text-sm text-ink-muted">
            One JSON file with your account, profile, library, jobs, resume settings and the list of your AI ranking calls. Your password is asked again, and we send you a mail to tell you.
          </p>
          <ExportButton />
        </Card>
        <Card className="flex flex-col items-start gap-3">
          <h2 className="text-lg font-extrabold tracking-tight">Delete your account</h2>
          <p className="text-sm text-ink-muted">
            Removes your account and all your data. This cannot be undone: download your data first if you want a copy.
          </p>
          <DeleteAccount email={user.email} />
        </Card>
      </div>
    </div>
  )
}
