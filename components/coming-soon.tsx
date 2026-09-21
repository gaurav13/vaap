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
    <div className="flex min-h-screen flex-col bg-background">
      {/* Thin gold accent line across the very top for an editorial feel */}
      <span className="h-[3px] w-full shrink-0" style={{ backgroundColor: GOLD }} aria-hidden />

      <div className="grid flex-1 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left: content */}
        <div className="relative flex flex-col px-6 py-8 sm:px-10 lg:px-16 lg:py-10">
          <header className="flex items-center justify-between gap-4">
            <VaapLogo height={68} className="sm:hidden" />
            <VaapLogo height={84} className="hidden sm:inline-flex" />
            <nav aria-label="Language" className="flex items-center gap-1 text-sm">
              <span className="rounded-full bg-mint px-3 py-1 font-semibold text-green">EN</span>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-muted-2 transition hover:text-heading"
              >
                日本語
              </button>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-muted-2 transition hover:text-heading"
              >
                اردو
              </button>
            </nav>
          </header>

          <div className="flex flex-1 flex-col justify-center py-12 lg:py-6">
            <div className="flex max-w-2xl items-start gap-6 lg:gap-8">
              {/* Far-left stacked eyebrow with gold vertical rule */}
              <div className="hidden shrink-0 items-stretch gap-3 pt-2 lg:flex">
                <span className="w-px self-stretch" style={{ backgroundColor: GOLD }} aria-hidden />
                <span className="text-xs font-semibold uppercase leading-relaxed tracking-[0.25em] text-heading">
                  People.
                  <br />
                  Industry.
                  <br />
                  Innovation.
                </span>
              </div>

              <div className="min-w-0">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.4em] text-green">
                  Our Platform Is
                </span>
                <span className="h-px flex-1 max-w-[80px]" style={{ backgroundColor: GOLD }} aria-hidden />
              </div>

              <h1 className="mt-5 font-serif text-[3.25rem] leading-[0.98] tracking-tight text-heading text-balance sm:text-6xl lg:text-[5rem]">
                Launching
                <br />
                Soon
              </h1>

              <p className="mt-7 max-w-md text-lg leading-relaxed text-body text-pretty">
                A unified platform for a transparent, innovative and inclusive virtual asset and blockchain ecosystem in
                Pakistan.
              </p>

              <div className="mt-9">
                <Link
                  href="/membership/apply"
                  className="group inline-flex items-center gap-3 rounded-full bg-green px-8 py-4 text-base font-semibold text-white shadow-lg shadow-green/25 ring-1 ring-inset ring-white/10 transition hover:shadow-xl hover:shadow-green/30 hover:brightness-110"
                >
                  <UserPlus className="size-5" aria-hidden />
                  Pre-Register for Membership
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <p className="mt-4 text-sm text-muted-2">
                  Be the first to join. Get updates on our launch, membership and events.
                </p>
              </div>

              <ul className="mt-14 grid grid-cols-2 gap-x-2 gap-y-9 sm:grid-cols-4 sm:divide-x sm:divide-line">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex flex-col items-center gap-3 px-2 text-center sm:px-3">
                    <span className="flex size-12 items-center justify-center rounded-full bg-mint ring-1 ring-green/10">
                      <Icon className="size-6 text-green" aria-hidden />
                    </span>
                    <span className="whitespace-pre-line text-[0.7rem] font-semibold uppercase leading-snug tracking-[0.12em] text-heading">
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right: imagery */}
        <div className="relative min-h-[340px] overflow-hidden bg-mint lg:min-h-full">
          <Image
            src="/images/vaap-launch-islamabad.png"
            alt="Faisal Mosque, Minar-e-Pakistan and the mountains under a crescent moon, rendered in green"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 48vw"
            className="object-cover"
          />
          {/* Subtle wash to soften the top-left where the panel meets the content column */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(120deg, rgba(244,247,244,0.55) 0%, rgba(244,247,244,0.05) 32%, rgba(6,46,33,0) 70%)",
            }}
            aria-hidden
          />

          <div className="absolute left-6 top-8 sm:left-10">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold uppercase leading-relaxed tracking-[0.35em] text-green">
                Blockchain
                <br />
                For a Brighter
                <br />
                Pakistan
              </span>
              <span className="h-px w-12" style={{ backgroundColor: GOLD }} aria-hidden />
            </div>
          </div>

          <div className="absolute bottom-8 right-6 flex flex-col items-end text-right sm:right-10">
            <span className="text-sm font-semibold uppercase leading-relaxed tracking-[0.3em] text-green">
              Trust.
              <br />
              Collaboration.
              <br />
              Opportunity.
            </span>
            <span className="mt-2 block h-px w-12" style={{ backgroundColor: GOLD }} aria-hidden />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-line px-6 py-6 sm:px-10 lg:px-16">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-2">
            © {new Date().getFullYear()} Virtual Assets Association of Pakistan (VAAP). All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-heading">
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
            <nav className="flex items-center gap-5 text-sm text-body">
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
