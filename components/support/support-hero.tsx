import Image from "next/image"
import { ShieldAlert, Lock, MessageSquare, Users, ArrowRight, Headphones } from "lucide-react"

const FEATURES = [
  { icon: ShieldAlert, title: "Scam & Fraud", subtitle: "Awareness" },
  { icon: Lock, title: "Security", subtitle: "Guidance" },
  { icon: MessageSquare, title: "Complaint", subtitle: "Support" },
  { icon: Users, title: "Regulatory", subtitle: "Referral" },
]

export function SupportHero() {
  return (
    <section className="relative isolate overflow-hidden bg-background">
      <div className="relative grid items-stretch lg:grid-cols-2">
        {/* Right-side illustration */}
        <div className="relative order-1 min-h-[280px] sm:min-h-[360px] lg:order-2 lg:min-h-[600px]">
          <Image
            src="/images/support-hero-shield.png"
            alt="A green security shield with a padlock surrounded by Bitcoin, Ethereum and Tether coins, set against the Faisal Mosque and Margalla hills of Islamabad"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center"
          />

          {/* Fade the illustration into the page background on the left edge (desktop) */}
          <div
            aria-hidden
            className="absolute inset-0 hidden lg:block"
            style={{
              background:
                "linear-gradient(90deg, var(--background) 0%, rgba(255,255,255,0.35) 14%, rgba(255,255,255,0) 42%)",
            }}
          />

          {/* Floating labels */}
          <span className="pointer-events-none absolute left-[30%] top-[36%] hidden text-xs font-semibold uppercase tracking-[0.2em] text-navy/70 lg:block">
            Educate
          </span>
          <span className="pointer-events-none absolute right-[26%] top-[14%] hidden text-xs font-semibold uppercase tracking-[0.2em] text-navy/70 lg:block">
            Protect
          </span>
          <span className="pointer-events-none absolute right-[20%] top-[46%] hidden text-xs font-semibold uppercase tracking-[0.2em] text-navy/70 lg:block">
            Support
          </span>
          <span className="pointer-events-none absolute right-[5%] top-[18%] hidden max-w-[7rem] text-right text-xs font-bold uppercase leading-tight tracking-[0.14em] text-navy/80 lg:block">
            Together for a Safer Pakistan
          </span>

          {/* Diagonal green corner */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 hidden h-40 w-72 bg-green lg:block"
            style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
          />
          <p className="pointer-events-none absolute bottom-6 right-6 hidden max-w-[9rem] text-right font-serif text-sm leading-snug text-white lg:block">
            A Trusted Community for a Secure Digital Future
          </p>
        </div>

        {/* Left-side content */}
        <div className="relative order-2 flex items-center px-5 py-12 sm:px-8 lg:order-1 lg:py-20 lg:pl-8 lg:pr-12 xl:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
          <div className="w-full max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-green">
              Member Protection &amp; Support
            </p>

            <h1 className="mt-4 font-serif text-4xl leading-[1.04] text-balance text-foreground sm:text-5xl lg:text-6xl">
              Stop Scams.
              <span className="mt-1 block text-green">Stay Secure.</span>
              <span className="mt-1 block">Get Support.</span>
            </h1>

            <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground">
              Helping virtual asset users identify scams, protect their digital assets, report concerns, and access
              trusted guidance and the right support channels.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#complaint"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
              >
                Report a Scam or Concern
                <ArrowRight className="size-4" />
              </a>
              <a
                href="#complaint"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-green/40 bg-transparent px-6 py-3 text-sm font-semibold text-green transition-colors hover:bg-green/5"
              >
                <Headphones className="size-4" />
                Get Support
              </a>
            </div>

            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, subtitle }) => (
                <li key={title} className="flex items-center gap-2.5">
                  <Icon className="size-6 shrink-0 text-green" />
                  <span className="text-sm font-medium leading-tight text-foreground">
                    {title}
                    <br />
                    {subtitle}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
