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
      <div className="grid flex-1 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left: content */}
        <div className="relative flex flex-col px-6 py-8 sm:px-10 lg:px-16 lg:py-12">
          <header className="flex items-center justify-between">
            <VaapLogo height={44} />
            <nav aria-label="Language" className="flex items-center gap-3 text-sm">
              <span className="font-medium text-heading">EN</span>
              <span className="text-line">|</span>
              <span className="text-muted-2">日本語</span>
              <span className="text-line">|</span>
              <span className="text-muted-2">اردو</span>
            </nav>
          </header>

          <div className="flex flex-1 flex-col justify-center py-12 lg:py-0">
            <div className="max-w-xl">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold uppercase tracking-[0.35em] text-green">
                  Our Platform Is
                </span>
                <span className="h-px w-16" style={{ backgroundColor: GOLD }} aria-hidden />
              </div>

              <h1 className="mt-4 font-serif text-5xl leading-[1.05] tracking-tight text-heading text-balance sm:text-6xl lg:text-7xl">
                Launching Soon
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-body text-pretty">
                A unified platform for a transparent, innovative and inclusive virtual asset and blockchain ecosystem in
                Pakistan.
              </p>

              <div className="mt-8">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-3 rounded-full bg-green px-8 py-4 text-base font-semibold text-white shadow-lg shadow-green/20 transition hover:brightness-110"
                >
                  <UserPlus className="size-5" aria-hidden />
                  Pre-Register for Membership
                  <ArrowRight className="size-5" aria-hidden />
                </Link>
                <p className="mt-3 text-sm text-muted-2">
                  Be the first to join. Get updates on our launch, membership and events.
                </p>
              </div>

              <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex flex-col items-center gap-3 px-2 text-center sm:px-4">
                    <span className="flex size-12 items-center justify-center rounded-full bg-mint">
                      <Icon className="size-6 text-green" aria-hidden />
                    </span>
                    <span className="whitespace-pre-line text-xs font-semibold uppercase tracking-wider text-heading">
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <span
            className="pointer-events-none absolute left-0 top-1/3 hidden h-24 w-1 lg:block"
            style={{ backgroundColor: GOLD }}
            aria-hidden
          />
        </div>

        {/* Right: imagery */}
        <div className="relative min-h-[320px] overflow-hidden lg:min-h-full">
          <Image
            src="/images/hero-islamabad.png"
            alt="Faisal Mosque and Pakistan's skyline representing a stronger digital Pakistan"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 48vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(6,46,33,0.35) 0%, rgba(6,46,33,0.05) 45%, rgba(6,46,33,0.55) 100%)" }}
            aria-hidden
          />
          <div className="absolute left-6 top-8 sm:left-10">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold uppercase tracking-[0.35em] text-white drop-shadow">
                Blockchain
                <br />
                For a Brighter
                <br />
                Pakistan
              </span>
              <span className="h-px w-12" style={{ backgroundColor: GOLD }} aria-hidden />
            </div>
          </div>
          <div className="absolute bottom-8 right-6 text-right sm:right-10">
            <span className="text-sm font-semibold uppercase leading-relaxed tracking-[0.3em] text-white drop-shadow">
              Trust.
              <br />
              Collaboration.
              <br />
              Opportunity.
            </span>
            <span className="mt-2 block h-px w-12 self-end justify-self-end" style={{ backgroundColor: GOLD, marginLeft: "auto" }} aria-hidden />
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
