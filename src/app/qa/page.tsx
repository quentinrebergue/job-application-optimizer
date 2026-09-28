import { listJobs } from '@/lib/data'
import { PageHeader } from '@/components/ui/PageHeader'
import { SessionConfig } from '@/components/qa/SessionConfig'
import { GeneralQAManager } from '@/components/qa/GeneralQAManager'

export const dynamic = 'force-dynamic'

export default async function QAPage() {
  const jobs = await listJobs()

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <PageHeader
        title="Q&A Trainer"
        subtitle="Practice answering questions about your resume and background."
      />

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Configure Session</h2>
        <p className="text-sm text-slate-500 mb-6">
          Questions are drawn from general flashcards and your entity Q&amp;A banks.
        </p>
        <SessionConfig jobs={jobs} />
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">General Flashcards</h2>
        <p className="text-sm text-slate-500 mb-4">
          Browse by topic, add new cards, or remove ones you've mastered. These appear in every session.
        </p>
        <GeneralQAManager />
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        <strong className="text-slate-700">How it works</strong>
        <ol className="mt-2 list-decimal list-inside space-y-1">
          <li>Cards are shuffled and shown one question at a time.</li>
          <li>Reveal the answer, then mark <em>Got It</em> or <em>Practice More</em>.</li>
          <li><em>Practice More</em> re-queues the card — it will appear again.</li>
          <li>Session ends when the queue is empty.</li>
        </ol>
      </div>
    </div>
  )
}
