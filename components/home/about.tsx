import { ArrowRight } from 'lucide-react'

const STATS = [
  { value: '7', label: 'Membership Categories' },
  { value: '100+', label: 'Ecosystem Partners' },
  { value: '25+', label: 'Events & Programs' },
]

export function About() {
  return (
    <section className="bg-surface py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: copy */}
          <div>
            <h2 className="fluid-h2 font-bold text-heading">
              About VAAP
            </h2>
            <p className="mt-4 text-lg font-semibold text-heading">
              A unified voice for Pakistan&apos;s virtual asset industry.
            </p>
            <p className="mt-4 max-w-xl leading-relaxed text-body">
              VAAP is an independent industry association dedicated to supporting
              the growth of a responsible, innovative and inclusive virtual asset
              ecosystem in Pakistan through policy engagement, education,
              collaboration and global partnerships.
            </p>

            <a
              href="#"
              className="mt-7 inline-flex items-center gap-2 rounded-lg bg-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
            >
              Learn More About VAAP <ArrowRight className="size-4" />
            </a>

            <div className="mt-10 grid grid-cols-2 gap-6 border-t border-line pt-8 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-3xl font-extrabold text-green">{s.value}</p>
                  <p className="mt-1 text-sm text-muted-2">{s.label}</p>
                </div>
              ))}
              <div>
                <p className="text-sm font-semibold text-heading">A Stronger</p>
                <p className="text-2xl font-extrabold text-heading">Pakistan</p>
                <p className="mt-1 text-sm text-muted-2">Our Shared Goal</p>
              </div>
            </div>
          </div>

          {/* Right: featured image card */}
          <div className="relative overflow-hidden rounded-2xl bg-navy">
            <img
              src="/images/next-generation.png"
              alt="Young Pakistani professionals collaborating"
              className="absolute inset-0 size-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/20" />
            <div className="relative flex h-full flex-col justify-end p-8 lg:p-10">
              <h3 className="text-2xl font-bold leading-tight text-white lg:text-3xl">
                Empowering Pakistan&apos;s Next Generation
              </h3>
              <p className="mt-3 text-white/75">Startups. Talent. Ideas. Impact.</p>
              <a
                href="#"
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Explore Innovation Hub <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
