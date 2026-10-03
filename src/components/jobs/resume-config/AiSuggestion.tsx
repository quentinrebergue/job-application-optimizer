import { Button } from '@/components/ui/Button'
import { eyebrow } from '@/components/ui/styles'

interface Props {
  text: string
  onApply: () => void
}

/** A text the AI proposes for this job, with one button to use it. */
export function AiSuggestion({ text, onApply }: Props) {
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-control border-2 border-dashed border-ink bg-surface p-3">
      <p className={eyebrow}>AI suggestion</p>
      <p className="whitespace-pre-wrap text-sm">{text}</p>
      <div>
        <Button variant="secondary" size="sm" onClick={onApply}>Use this</Button>
      </div>
    </div>
  )
}
