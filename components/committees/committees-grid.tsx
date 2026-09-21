import Image from "next/image"
import Link from "next/link"

type Committee = {
  id: number
  name: string
  headName: string
  headTitle: string
  headPhoto: string | null
  headLinkedin: string | null
}

export function CommitteesGrid({ committees }: { committees: Committee[] }) {
  if (committees.length === 0) {
    return (
      <section className="bg-background">
        <div className="vaap-container py-12">
          <p className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-muted-2">
            Committees will appear here once added in the admin area.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-background">
      <div className="vaap-container py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-5">
          {committees.map((c) => (
            <Link
              key={c.id}
              href={`/committees/${c.id}`}
              className="group flex flex-col items-center rounded-xl border border-line-light bg-surface p-4 text-center transition-all hover:border-green-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-mint">
                {c.headPhoto ? (
                  <Image
                    src={c.headPhoto || "/placeholder.svg"}
                    alt={c.headName || c.name}
                    fill
                    sizes="(max-width: 768px) 45vw, 18vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-2xl font-bold text-green/40">
                    {(c.headName || c.name).charAt(0)}
                  </div>
                )}
              </div>

              <h3 className="mt-4 font-bold text-heading group-hover:text-green">{c.headName || "To be announced"}</h3>
              <p className="mt-0.5 text-sm text-muted-2">{c.headTitle}</p>
              <span className="my-3 h-px w-8 bg-green" aria-hidden="true" />
              <p className="text-sm font-semibold leading-snug text-heading text-balance">{c.name}</p>
              <span className="mt-3 text-xs font-semibold text-green opacity-0 transition-opacity group-hover:opacity-100">
                View profile
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
