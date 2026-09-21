import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function GovernanceCTA() {
  return (
    <section className="relative isolate overflow-hidden bg-navy">
      <Image
        src="/images/cta-lahore.png"
        alt="Minar-e-Pakistan, Lahore"
        fill
        sizes="100vw"
        className="object-cover object-center opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-dark via-navy-dark/95 to-navy/50" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-16">
        <div className="max-w-xl">
          <h2 className="text-pretty text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Help Shape a Responsible Digital Future
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-white/80">
            Join companies, professionals and innovators contributing to Pakistan&apos;s virtual asset ecosystem.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
          <Link
            href="/membership"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-hover"
          >
            Join VAAP
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/membership"
            className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Explore Membership
          </Link>
        </div>
      </div>
    </section>
  )
}
