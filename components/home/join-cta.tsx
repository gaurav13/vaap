import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function JoinCta() {
  return (
    <section className="relative isolate overflow-hidden bg-navy">
      <img
        src="/images/cta-lahore.png"
        alt="Minar-e-Pakistan in Lahore at dusk"
        className="absolute inset-0 -z-10 size-full object-cover opacity-40"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/90 to-navy/60" />

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-lg">
          <p className="mt-3 leading-relaxed text-white/70">
            Join VAAP today and be part of the national industry representative.
          </p>
        </div>

        <Link
          href="/membership"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-green px-7 py-4 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
        >
          Join VAAP Now <ArrowRight className="size-4" />
        </Link>

        <p className="pointer-events-none hidden shrink-0 font-serif text-lg italic leading-tight text-white/70 lg:block">
          People
          <br />
          Innovation
          <br />
          Collaboration
          <br />
          <span className="text-green">A Stronger Pakistan</span>
        </p>
      </div>
    </section>
  )
}
