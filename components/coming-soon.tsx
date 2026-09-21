import Image from "next/image"
import Link from "next/link"
import { ArrowRight, UserPlus, Users, Boxes, ShieldCheck, TrendingUp, Mail } from "lucide-react"
import { VaapLogo } from "@/components/vaap-logo"

const GOLD = "#C6A15B"

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.9 1.5h3.7l-8.1 9.2 9.5 12.6h-7.4l-5.8-7.6-6.7 7.6H.4l8.6-9.8L0 1.5h7.6l5.2 6.9 6.1-6.9Zm-1.3 19.8h2L6.5 3.6H4.4L17.6 21.3Z" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.12-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.52A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.12 2.13c1.88.52 9.38.52 9.38.52s7.5 0 9.38-.52a3 3 0 0 0 2.12-2.13A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    </svg>
  )
}

const FEATURES = [
  { icon: Users, label: "Industry\nRepresentation" },
  { icon: Boxes, label: "Blockchain\nInnovation" },
  { icon: ShieldCheck, label: "Clearer\nRegulations" },
  { icon: TrendingUp, label: "A Stronger\nPakistan" },
]

export function ComingSoon() {
  return (
    <div className="flex min-h-screen flex-col bg-background md:h-dvh md:min-h-0 md:overflow-hidden">
      {/* Thin gold accent line across the very top for an editorial feel */}
      <span className="h-[3px] w-full shrink-0" style={{ backgroundColor: GOLD }} aria-hidden />

      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[1.05fr_0.95fr]">
        {/* Left: content */}
        <div
          className="relative flex min-h-0 flex-col md:overflow-hidden"
          style={{ padding: "clamp(1.25rem, 2.4vw, 2.75rem) clamp(1.25rem, 3.4vw, 4rem)" }}
        >
          <header className="flex shrink-0 items-center">
            <VaapLogo height={48} className="sm:hidden" />
            <span className="hidden sm:inline-flex" style={{ height: "clamp(56px, 5.2vw, 84px)" }}>
              <VaapLogo height={84} className="h-full w-auto" />
            </span>
          </header>

          <div className="flex min-h-0 flex-1 flex-col justify-start">
            <div
              className="flex max-w-3xl items-start"
              style={{ paddingTop: "clamp(1.5rem, 3vw, 3rem)" }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-4">
                  <span className="text-[0.78rem] font-extrabold uppercase tracking-[0.4em] text-green sm:text-sm">
                    National Industry Representative
                  </span>
                  <span className="h-px flex-1 max-w-[80px]" style={{ backgroundColor: GOLD }} aria-hidden />
                </div>

                <h1
                  className="font-serif font-medium leading-[0.95] tracking-tight text-balance whitespace-nowrap"
                  style={{ marginTop: "clamp(0.75rem, 1.4vw, 1.25rem)", fontSize: "clamp(2.5rem, 4.4vw, 4.75rem)" }}
                >
                  <span className="text-heading">Launching</span>{" "}
                  <span style={{ color: GOLD }}>Soon</span>
                </h1>

                <p
                  className="max-w-xl leading-relaxed text-body text-pretty"
                  style={{ marginTop: "clamp(0.75rem, 1.2vw, 1.1rem)", fontSize: "clamp(0.95rem, 1vw, 1.125rem)" }}
                >
                  The{" "}
                  <span className="font-semibold" style={{ color: GOLD }}>
                    nationally recognized trade organization
                  </span>{" "}
                  representing Pakistan&apos;s virtual assets industry under the{" "}
                  <span className="font-semibold text-heading">Ministry of Commerce</span> framework.
                </p>

                <p
                  className="max-w-md leading-relaxed text-body text-pretty"
                  style={{ marginTop: "clamp(0.6rem, 1vw, 0.9rem)", fontSize: "clamp(0.95rem, 1vw, 1.125rem)" }}
                >
                  A unified platform for a transparent, innovative and inclusive virtual asset and blockchain ecosystem
                  in Pakistan.
                </p>

                <div style={{ marginTop: "clamp(1rem, 1.5vw, 1.5rem)" }}>
                  <Link
                    href="/membership/apply"
                    className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-green px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-green/25 ring-1 ring-inset ring-white/10 transition hover:shadow-xl hover:shadow-green/30 hover:brightness-110 sm:w-auto lg:text-base"
                  >
                    <UserPlus className="size-5" aria-hidden />
                    Pre-Register for Membership
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
                  </Link>
                  <p className="mt-2.5 text-sm text-muted-2 text-pretty">
                    Be the first to join. Get updates on our launch, membership and events.
                  </p>
                </div>

                <ul
                  className="grid grid-cols-2 border-t border-line lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-line"
                  style={{
                    marginTop: "clamp(1rem, 1.8vw, 1.75rem)",
                    paddingTop: "clamp(1rem, 1.5vw, 1.5rem)",
                    columnGap: "1rem",
                    rowGap: "clamp(0.75rem, 1.2vw, 1.25rem)",
                  }}
                >
                  {FEATURES.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex flex-col items-center gap-2.5 px-2 text-center lg:px-4">
                      <span
                        className="flex items-center justify-center rounded-full bg-mint ring-1 ring-green/10"
                        style={{ width: "clamp(2.75rem, 3.4vw, 3.5rem)", height: "clamp(2.75rem, 3.4vw, 3.5rem)" }}
                      >
                        <Icon className="text-green" style={{ width: "clamp(1.35rem, 1.7vw, 1.6rem)", height: "clamp(1.35rem, 1.7vw, 1.6rem)" }} aria-hidden />
                      </span>
                      <span className="whitespace-pre-line text-[0.72rem] font-semibold uppercase leading-snug tracking-[0.12em] text-heading sm:text-[0.78rem]">
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right: imagery (bright daytime mood) */}
        <div className="relative order-first h-64 overflow-hidden bg-[#dbe7ea] sm:h-80 md:order-none md:h-auto md:min-h-full">
          <Image
            src="/images/vaap-launch-islamabad-bright.png"
            alt="Faisal Mosque and the Islamabad skyline against the green Margalla Hills at sunrise, with subtle blockchain network graphics, a glowing map of Pakistan, and the Pakistan flag in the sky"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 48vw"
            className="object-cover"
          />
          {/* Soft washes: darken top-left and bottom corners just enough to keep overlay text readable */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(150deg, rgba(6,20,15,0.42) 0%, rgba(6,20,15,0.12) 26%, rgba(6,20,15,0) 52%)",
            }}
            aria-hidden
          />

          <div className="absolute left-5 top-6 sm:left-8 sm:top-8">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase leading-relaxed tracking-[0.35em] text-white sm:text-sm">
                Blockchain
                <br />
                For a Brighter
                <br />
                Pakistan
              </span>
              <span className="h-px w-12" style={{ backgroundColor: GOLD }} aria-hidden />
            </div>
          </div>

          {/* Decorative gold-edged green diagonal wedge in the bottom-right corner */}
          <div
            className="pointer-events-none absolute bottom-0 right-0 h-48 w-64 sm:h-64 sm:w-80"
            style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)", backgroundColor: GOLD }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-0 right-0 h-48 w-64 sm:h-64 sm:w-80"
            style={{
              clipPath: "polygon(100% 6%, 100% 100%, 8% 100%)",
              backgroundColor: "#0d3b2a",
            }}
            aria-hidden
          />
          <div className="absolute bottom-5 right-5 flex flex-col items-end text-right sm:bottom-7 sm:right-8">
            <span className="text-[0.7rem] font-semibold uppercase leading-relaxed tracking-[0.28em] text-white sm:text-sm">
              Trust.
              <br />
              Collaboration.
              <br />
              Opportunity.
              <br />
              <span style={{ color: GOLD }}>Real Impact.</span>
            </span>
            <span className="mt-2.5 block h-px w-12" style={{ backgroundColor: GOLD }} aria-hidden />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="shrink-0 border-t border-line"
        style={{ padding: "clamp(0.75rem, 1.2vw, 1.25rem) clamp(1.25rem, 3.4vw, 4rem)" }}
      >
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="order-2 text-center text-xs text-muted-2 sm:order-1 sm:text-left">
            © {new Date().getFullYear()} Virtual Assets Association of Pakistan (VAAP). All rights reserved.
          </p>
          <div className="order-1 flex flex-col items-center gap-3 sm:order-2 sm:flex-row sm:gap-6">
            <div className="flex items-center gap-5 text-heading sm:gap-4">
              <Link href="#" aria-label="LinkedIn" className="transition hover:text-green">
                <LinkedinIcon className="size-5" />
              </Link>
              <Link href="#" aria-label="X" className="transition hover:text-green">
                <XIcon className="size-4" />
              </Link>
              <Link href="#" aria-label="YouTube" className="transition hover:text-green">
                <YoutubeIcon className="size-5" />
              </Link>
              <Link href="/contact" aria-label="Email" className="transition hover:text-green">
                <Mail className="size-5" aria-hidden />
              </Link>
            </div>
            <span className="hidden h-4 w-px bg-line sm:block" aria-hidden />
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-body">
              <Link href="/contact" className="transition hover:text-green">
                Contact Us
              </Link>
              <Link href="#" className="transition hover:text-green">
                Privacy Policy
              </Link>
              <Link href="#" className="transition hover:text-green">
                Terms of Use
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
