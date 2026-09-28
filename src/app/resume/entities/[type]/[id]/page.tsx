export default function EditEntityPage({ params }: { params: { type: string; id: string } }) {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Edit Entity</h1>
      <p className="text-slate-500">Type: {params.type} / ID: {params.id}</p>
    </div>
  )
}
