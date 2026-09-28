import { getExercise } from '@/lib/data'
import { notFound } from 'next/navigation'
import { ExerciseDetail } from '@/components/coding/ExerciseDetail'

type Props = { params: Promise<{ id: string }> }

export default async function ExerciseDetailPage({ params }: Props) {
  const { id } = await params
  const exercise = await getExercise(id)
  if (!exercise) notFound()

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <ExerciseDetail exercise={exercise} />
    </div>
  )
}
