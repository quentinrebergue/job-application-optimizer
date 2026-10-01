import { getExercise } from '@/lib/data'
import { notFound } from 'next/navigation'
import { ExerciseDetail } from '@/components/coding/ExerciseDetail'
import { verifySession } from '@/lib/auth/dal'

type Props = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export default async function ExerciseDetailPage({ params }: Props) {
  const { userId } = await verifySession()
  const { id } = await params
  const exercise = await getExercise(userId, id)
  if (!exercise) notFound()

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <ExerciseDetail exercise={exercise} />
    </div>
  )
}
