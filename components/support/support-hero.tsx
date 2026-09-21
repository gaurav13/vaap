import Image from "next/image"
import { ArrowRight, Search, ShieldCheck } from "lucide-react"

export function SupportHero() {
  return (
    <section aria-labelledby="support-hero-heading" className="bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="relative isolate overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
          {/* Faisal Mosque illustration on the right, fading into the card */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[62%] lg:w-[55%]">
            <Image
              src="/images/support-faisal-mosque.png"
              alt=""
              aria-hidden="true"
              fill
              priority
              sizes="(max-width: 640px) 100vw, 55vw"
              className="object-cover object-center"
            />
            {/* Left-to-right fade so text stays readable over the image */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-muted via-muted/85 to-transparent sm:from-muted sm:via-muted/70"
              aria-hidden="true"
            />
          </div>

          {/* "A SAFER DIGITAL PAKISTAN" watermark with shield */}
          <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-3 lg:flex">
            <ShieldCheck className="h-16 w-16 text-primary-foreground/80" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-sm font-semibold uppercase leading-tight tracking-[0.15em] text-primary-foreground/90">
              A Safer
              <br />
              Digital
              <br />
              Pakistan
            </span>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-xl px-6 py-8 sm:px-10 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary sm:text-sm">
              Member Support &amp; Grievance
            </p>

            <h1
              id="support-hero-heading"
              className="mt-3 text-balance font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              Stop Scams. Get Support.
            </h1>

            <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              Report concerns, get guidance and stay safe in the virtual asset ecosystem.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#complaint"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-green-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
              >
                Report a Concern
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#complaint"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-border bg-card px-5 py-3 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Track Your Case
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
