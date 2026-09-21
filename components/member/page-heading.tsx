export function PageHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-serif text-2xl font-bold text-heading text-balance sm:text-3xl">{title}</h1>
      {description && <p className="mt-1 max-w-2xl text-pretty text-sm text-muted-2">{description}</p>}
    </div>
  )
}
