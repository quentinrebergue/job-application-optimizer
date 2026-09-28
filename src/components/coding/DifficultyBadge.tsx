import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/config'
import type { Difficulty } from '@/types'

interface Props {
  difficulty: Difficulty
}

export function DifficultyBadge({ difficulty }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${DIFFICULTY_COLORS[difficulty]}`}
    >
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  )
}
