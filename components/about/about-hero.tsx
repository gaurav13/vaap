import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

function TaglineStack({ lines, className = "" }: { lines: string[]; className?: string }) {
  return (
    <ul className={`flex flex-col gap-2 border-l border-green/70 pl-4 ${className}`}>
      {lines.map((line) => (
        <li key={line} className="text-[11px] font-bold uppercase tracking-[0.28em] text-navy">
          {line}
        </li>
      ))}
    </ul>
  )
}

export function AboutHero() {
  return (
    <section className="relative overflow-hidden border-b border-line-light bg-mint-2">
      {/* Artwork: full-bleed on large screens, stacked below copy on mobile */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[68%] lg:block" aria-hidden="true">
        <Image
          src="/images/about/about-hero-art.png"
          alt=""
          fill
          priority
          quality={90}
          sizes="70vw"
          className="object-cover object-right"
        />
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-mint-2 to-transparent" />
      </div>

      <div className="vaap-container relative py-14 lg:min-h-[560px] lg:py-20 xl:min-h-[600px]">
        <div className="max-w-xl xl:max-w-2xl">
          <div className="flex items-center gap-4">
            <span className="h-0.5 w-12 bg-green" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-green">About VAAP</span>
          </div>

          <h1 className="mt-6 font-serif text-4xl font-bold leading-[1.08] text-navy text-balance sm:text-5xl xl:text-6xl">
            Uniting Pakistan&apos;s <span className="text-green">Virtual Asset Industry</span> for a Stronger Tomorrow
          </h1>

          <p className="mt-6 max-w-xl leading-relaxed text-body text-pretty">
            The Virtual Asset Industry Alliance of Pakistan (VAAP) is an industry-led initiative that brings together
            companies, investors, professionals, and innovators to support responsible growth, collaboration,
            education, and innovation across Pakistan&apos;s virtual asset ecosystem.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/membership"
              className="group inline-flex items-center gap-2 rounded-md bg-green px-6 py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-green-hover"
            >
              Join Our Community
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="#mission"
              className="group inline-flex items-center gap-2 rounded-md border border-green bg-card px-6 py-3.5 text-sm font-bold text-green transition-colors hover:bg-mint"
            >
              Learn More
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <TaglineStack
          lines={["Innovation", "Inclusion", "Impact"]}
          className="absolute left-[48%] top-[38%] hidden xl:flex"
        />
        <TaglineStack
          lines={["People", "Partnerships", "Progress", "A Stronger Digital Pakistan"]}
          className="absolute right-8 top-16 hidden max-w-[13rem] lg:flex"
        />
      </div>

      <div className="relative aspect-[16/10] w-full lg:hidden">
        <Image
          src="/images/about/about-hero-art.png"
          alt="Minar-e-Pakistan with mountains and the Pakistan flag"
          fill
          quality={90}
          sizes="100vw"
          className="object-cover object-right"
        />
        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-mint-2 to-transparent" aria-hidden="true" />
      </div>
    </section>
  )
}
