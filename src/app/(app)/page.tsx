import Link from 'next/link'
import { cardClasses } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { ENTITY_TYPE_IDS } from '@/config'
import { listEntities, listJobs } from '@/lib/data'
import { verifySession } from '@/lib/auth/dal'
import { page } from '@/components/ui/styles'

export const dynamic = 'force-dynamic'

/** Home: the two parts of the app, with where you stand in each. */
export default async function HomePage() {
  const { userId } = await verifySession()
  const [jobs, lists] = await Promise.all([
    listJobs(userId),
    Promise.all(ENTITY_TYPE_IDS.map((t) => listEntities(userId, t))),
  ])
  const entries = lists.flat().length
  const inProgress = jobs.filter((j) => j.status === 'applied' || j.status === 'interview').length

  const cards = [
    {
      href: '/jobs',
      title: 'Jobs',
      text: 'Add an offer, then get a resume tailored to it.',
      stats: [`${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`, `${inProgress} in progress`],
    },
    {
      href: '/resume',
      title: 'Resume',
      text: 'Your profile and the library every resume is built from.',
      stats: [`${entries} ${entries === 1 ? 'entry' : 'entries'}`],
    },
  ]

  return (
    <div className={page}>
      <PageHeader title="FastResume" subtitle="From a job offer to a tailored resume in a few clicks." />
      <div className="grid gap-6 sm:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className={cardClasses({ interactive: true, className: 'flex flex-col gap-3 p-6' })}>
            <span className="text-2xl font-extrabold tracking-tight">{card.title}</span>
            <span className="text-ink-muted">{card.text}</span>
            <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm font-semibold tabular-nums">
              {card.stats.map((s) => <span key={s}>{s}</span>)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
