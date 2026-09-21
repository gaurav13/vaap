export function CommitteesHero() {
  return (
    <section className="border-b border-line-light bg-mint-2">
      <div className="vaap-container py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-green" aria-hidden="true" />
              <span className="text-xs font-semibold tracking-[0.2em] text-green">OUR COMMITTEES</span>
            </div>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-heading text-balance lg:text-5xl">
              Committees
            </h1>
            <p className="mt-4 text-pretty leading-relaxed text-muted-2">
              Our committees bring together industry experts, professionals and stakeholders to work on key
              areas for the growth, development and responsible adoption of virtual assets in Pakistan.
            </p>
          </div>

          <div className="flex gap-4 lg:pl-8">
            <div className="hidden h-full w-px bg-line lg:block" aria-hidden="true" />
            <div className="flex flex-col gap-4 text-xs font-semibold tracking-[0.15em]">
              <div className="flex flex-col gap-1 text-navy">
                <span>COLLABORATION</span>
                <span>KNOWLEDGE</span>
                <span>PROGRESS</span>
              </div>
              <span className="h-px w-8 bg-green" aria-hidden="true" />
              <div className="flex flex-col gap-1 text-green">
                <span>A STRONGER</span>
                <span>DIGITAL PAKISTAN</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
