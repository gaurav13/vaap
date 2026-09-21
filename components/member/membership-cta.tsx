import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Users, CreditCard, ScrollText, Network } from "lucide-react"

const BENEFITS = [
  { icon: Users, label: "Voting\nRights" },
  { icon: CreditCard, label: "Digital\nMembership Card" },
  { icon: ScrollText, label: "Official\nCertificate" },
  { icon: Network, label: "Industry\nRepresentation" },
] as const

/**
 * Premium "Join VAAP" membership call-to-action.
 * Shown on the member dashboard only for users without an active membership.
 */
export function MembershipCta({ pending }: { pending?: boolean }) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5"
      style={{
        background:
          "linear-gradient(115deg, #06251b 0%, #0a3b2b 42%, #0d4633 100%)",
      }}
      aria-label="Apply for VAAP membership"
    >
      {/* faint decorative pattern glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/2 size-72 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(201,162,39,0.18), transparent 70%)" }}
      />

      <div className="relative grid items-stretch gap-0 lg:grid-cols-[1.08fr_0.92fr]">
        {/* ── Left: message + benefits ─────────────────────────── */}
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          {/* eyebrow */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">
              Become a Part of Change
            </span>
            <span aria-hidden className="hidden h-px flex-1 bg-gradient-to-r from-gold/70 to-transparent sm:block" />
          </div>

          {/* headline */}
          <h2 className="mt-5 font-serif text-3xl font-bold leading-[1.1] text-white text-balance sm:text-[2.6rem]">
            {pending ? (
              <>Complete your VAAP membership</>
            ) : (
              <>
                Join the Virtual Assets
                <br className="hidden sm:block" /> Association of{" "}
                <span style={{ color: "#3fae76" }}>Pakistan</span>
              </>
            )}
          </h2>

          {/* subtitle */}
          <p className="mt-4 max-w-lg text-pretty text-sm leading-relaxed text-white/70 sm:text-base">
            {pending
              ? "Your application is under review. You can update your details or resume your application any time."
              : "Be an official member of VAAP and contribute to a transparent, innovative and inclusive virtual asset ecosystem in Pakistan."}
          </p>

          {/* benefits */}
          <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4">
            {BENEFITS.map(({ icon: Icon, label }, i) => (
              <li key={label} className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-inner"
                    style={{ background: "linear-gradient(145deg, #1c6b4c, #0e4a33)" }}
                  >
                    <Icon className="size-5" strokeWidth={2} />
                  </span>
                  <span className="text-sm font-semibold leading-tight text-white whitespace-pre-line">
                    {label}
                  </span>
                </div>
                {i < BENEFITS.length - 1 && (
                  <span aria-hidden className="hidden h-9 w-px bg-white/15 sm:block" />
                )}
              </li>
            ))}
          </ul>

          {/* mobile apply button (image panel is desktop-only) */}
          <Link
            href="/dashboard/membership"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-7 py-3.5 text-sm font-bold text-[#06251b] shadow-md transition-transform hover:scale-[1.02] lg:hidden"
            style={{ background: "linear-gradient(145deg, #e7c766, #c9a227)" }}
          >
            {pending ? "Continue Application" : "Apply for Membership"}
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* ── Right: landmark image with gold arc + CTA ────────── */}
        <div className="relative hidden min-h-[300px] lg:block">
          {/* image */}
          <Image
            src="/images/vaap-pakistan-landmarks.png"
            alt="Landmarks of Pakistan including Faisal Mosque and Minar-e-Pakistan"
            fill
            sizes="(min-width: 1024px) 45vw, 0px"
            className="object-cover object-center"
            priority
          />
          {/* soften image for text legibility */}
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(6,37,27,0.35) 0%, rgba(255,255,255,0.05) 30%, transparent 60%)" }}
          />

          {/* gold curved seam between green panel and image */}
          <svg
            aria-hidden
            className="absolute -left-px top-0 z-10 h-full w-[110px]"
            viewBox="0 0 110 600"
            preserveAspectRatio="none"
            fill="none"
          >
            <path d="M110 0 C 20 180, 20 420, 110 600 L 0 600 L 0 0 Z" fill="#0d4633" />
            <path
              d="M110 0 C 20 180, 20 420, 110 600"
              stroke="url(#goldArc)"
              strokeWidth="3"
              fill="none"
            />
            <defs>
              <linearGradient id="goldArc" x1="0" y1="0" x2="0" y2="600" gradientUnits="userSpaceOnUse">
                <stop stopColor="#e7c766" />
                <stop offset="0.5" stopColor="#c9a227" />
                <stop offset="1" stopColor="#e7c766" />
              </linearGradient>
            </defs>
          </svg>

          {/* top-right kicker */}
          <div className="absolute right-8 top-8 z-20 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0d4633]">
              A Stronger
              <br />
              Digital Pakistan
            </p>
            <span aria-hidden className="ml-auto mt-2 block h-0.5 w-12 bg-gold" />
          </div>

          {/* apply button + caption */}
          <div className="absolute bottom-10 right-8 z-20 flex flex-col items-end gap-3">
            <Link
              href="/dashboard/membership"
              className="inline-flex items-center justify-center gap-3 rounded-lg px-8 py-4 text-base font-bold text-[#06251b] shadow-xl transition-transform hover:scale-[1.02]"
              style={{ background: "linear-gradient(145deg, #e7c766, #c9a227)" }}
            >
              {pending ? "Continue Application" : "Apply for Membership"}
              <ArrowRight className="size-5" />
            </Link>
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-8 bg-[#0d4633]" />
              <span className="text-sm font-medium italic text-[#0d4633]">
                Together for a stronger digital Pakistan.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
