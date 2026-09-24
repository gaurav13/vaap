export function PageHero({
  eyebrow,
  title,
  description,
  image,
}: {
  eyebrow?: string
  title: string
  description?: string
  image?: string | null
}) {
  return (
    <section className="border-b border-line bg-navy">
      <div className="vaap-container vaap-section-y-sm">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-green">{eyebrow}</p>
        )}
        <h1 className="fluid-h1 mt-3 max-w-3xl text-balance font-serif font-bold text-white">
          {title}
        </h1>
        {description && (
          <p className="fluid-lead mt-4 max-w-2xl text-pretty text-white/70">{description}</p>
        )}
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="mt-8 max-h-96 w-full rounded-xl object-cover"
          />
        )}
      </div>
    </section>
  )
}
