import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CalendarDays, CalendarPlus } from "lucide-react"

export function EventsHero({ submitHref }: { submitHref: string }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-mint/40">
      <Image
        src="/images/vaap-pakistan-landmarks.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="pointer-events-none object-cover object-right opacity-30 lg:opacity-100 lg:[mask-image:linear-gradient(to_right,transparent_30%,black_60%)]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:px-8 lg:py-20">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-green">
            <CalendarDays className="size-5" aria-hidden="true" />
            Events
            <span className="h-px w-12 bg-green/50" aria-hidden="true" />
          </p>
          <h1 className="mt-5 text-balance font-serif text-4xl font-bold leading-tight text-heading sm:text-5xl lg:text-6xl">
            {"Pakistan's Digital Asset"} <span className="text-green">Events Hub</span>
          </h1>
          <p className="mt-5 max-w-xl text-pretty leading-relaxed text-body">
            Discover, join, and stay updated on key events, industry gatherings, workshops, and ecosystem activities
            across Pakistan.
          </p>
        </div>

        <div className="lg:justify-self-end">
          <div className="flex max-w-md flex-col gap-5 rounded-2xl bg-green p-6 text-primary-foreground shadow-xl shadow-green/20 sm:flex-row sm:p-7">
            <CalendarPlus className="size-12 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-bold">Submit Your Event</h2>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/85">
                Hosting an event related to digital assets, blockchain, Web3 or fintech in Pakistan? VAAP members can
                submit it for review and listing.
              </p>
              <Link
                href={submitHref}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-card px-6 py-2.5 text-sm font-bold text-green transition hover:bg-mint"
              >
                Submit Event <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
