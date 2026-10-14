import { redirect } from 'next/navigation'
import { ChangeEmail } from '@/components/account/ChangeEmail'
import { ChangePassword } from '@/components/account/ChangePassword'
import { DeleteAccount } from '@/components/account/DeleteAccount'
import { ExportButton } from '@/components/account/ExportButton'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { page } from '@/components/ui/styles'
import { getCurrentUser, verifySession } from '@/lib/auth/dal'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Account' }

// Your data is yours (#104): a copy of everything, and the way out.
export default async function AccountPage() {
  await verifySession()
  const user = await getCurrentUser()
  if (!user) redirect('/session-expired')

  return (
    <div className={page}>
      <PageHeader title="Account" subtitle={user.email} />
      <div className="flex flex-col gap-section">
        <Card className="flex flex-col items-start gap-heading">
          <SectionTitle>Password</SectionTitle>
          <p className="text-small text-ink-muted">Changing it signs out your other devices.</p>
          <ChangePassword />
        </Card>
        <Card className="flex flex-col items-start gap-heading">
          <SectionTitle>Email address</SectionTitle>
          <p className="text-small text-ink-muted">
            It is the address you log in with and where we write to you. A link goes to the new address; nothing changes until you open it.
          </p>
          <ChangeEmail />
        </Card>
        <Card className="flex flex-col items-start gap-heading">
          <SectionTitle>Your data</SectionTitle>
          <p className="text-small text-ink-muted">
            One JSON file with your account, profile, library, jobs, resume settings and the list of your AI ranking calls. Your password is asked again, and we send you a mail to tell you.
          </p>
          <ExportButton />
        </Card>
        <Card className="flex flex-col items-start gap-heading">
          <SectionTitle>Delete your account</SectionTitle>
          <p className="text-small text-ink-muted">
            Removes your account and all your data. This cannot be undone: download your data first if you want a copy.
          </p>
          <DeleteAccount email={user.email} />
        </Card>
      </div>
    </div>
  )
}
