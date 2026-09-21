import Image from "next/image"
import { ShieldCheck, Users, BadgeCheck, ArrowRight, Search } from "lucide-react"

const PILLARS = ["People", "Technology", "Trust", "A Stronger Pakistan"]

const BADGES = [
  { icon: ShieldCheck, label: "Confidential" },
  { icon: Users, label: "Member-Focused" },
  { icon: BadgeCheck, label: "Trusted Guidance" },
]

export function SupportHero() {
  return (
    <section className="relative isolate overflow-hidden bg-navy">
      <div className="relative flex min-h-[560px] items-center md:min-h-[460px] lg:min-h-[520px]">
        <Image
          src="/images/hero-islamabad.png"
          alt="Faisal Mosque and the Margalla hills of Islamabad with the Pakistan national flag at sunrise"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_center]"
        />

        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,52,58,0.96) 0%, rgba(0,52,58,0.9) 34%, rgba(0,52,58,0.55) 64%, rgba(0,52,58,0.12) 100%)",
          }}
        />

        <div className="relative mx-auto flex w-full max-w-7xl items-center px-5 py-16 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">
              Member Support &amp; Grievance Centre
            </p>

            <h1 className="mt-4 font-serif text-4xl leading-[1.05] text-balance text-white sm:text-5xl lg:text-6xl">
              Your Voice.
              <span className="mt-1 block text-gold">A Safer Digital Pakistan.</span>
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/80">
              We support VAAP members and virtual asset users with guidance, complaint assistance, scam awareness and
              access to the right channels — for a more transparent and inclusive digital asset ecosystem.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#complaint"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
              >
                Submit a Complaint
                <ArrowRight className="size-4" />
              </a>
              <a
                href="#track"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                <Search className="size-4" />
                Track Your Case
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
              {BADGES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm font-medium text-white/85">
                  <Icon className="size-4 text-green-light" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="ml-auto hidden self-stretch pt-6 lg:flex lg:flex-col lg:justify-between">
            <ul className="space-y-1.5 text-right">
              {PILLARS.map((p) => (
                <li key={p} className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-right font-serif text-lg italic text-gold/90">
              Together for a Responsible
              <br />
              Digital Future
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
