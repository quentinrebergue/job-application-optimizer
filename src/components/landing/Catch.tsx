import { CONTACT_EMAIL } from '@/config/legal'
import { Card } from '@/components/ui/Card'

/** The honest answer to "what is the catch?", in the maintainer's own voice. Title on the left, the words in a card on the right. */
export function Catch() {
  return (
    <section aria-labelledby="catch-title" className="grid gap-section md:grid-cols-[1fr_2fr]">
      <h2 id="catch-title" className="text-statement">What&apos;s the catch?</h2>
      <Card className="flex flex-col gap-stack p-panel text-lead">
        <p><span className="mr-1.5 inline-block -rotate-1 rounded-control border-2 border-ink bg-accent px-2 font-extrabold shadow-hard">There isn&apos;t one.</span> FastResume is a side project: I&apos;m Quentin, and I build it to grow my skills.</p>
        <p>What would make me happiest is <strong className="font-extrabold">traffic</strong>: real people using it, real bugs, real feedback. It is how I get experience, and above all, how I get to help people land an interview.</p>
        <p className="text-ink-muted">
          No ads, no paid plan, no selling your data: <mark className="whitespace-nowrap bg-accent px-1 font-semibold text-ink">you are not the product</mark>. It is one person&apos;s project, so expect rough edges, and tell me about them at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent-strong underline underline-offset-4">{CONTACT_EMAIL}</a>.
        </p>
      </Card>
    </section>
  )
}
