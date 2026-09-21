import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ShieldCheck, TrendingUp, UsersRound } from "lucide-react"
import { getGovHero } from "@/lib/site-settings"
import type { GovHero } from "@/lib/site-settings"

// Builds the left-dark → right-light teal overlay, scaled by the CMS overlay
// strength (0–100) so admins can dial readability up or down.
function overlayGradient(strength: number) {
  const s = Math.min(Math.max(strength, 0), 100) / 100
  const teal = (a: number) => `rgba(3,42,46,${(a * s).toFixed(3)})`
  return `linear-gradient(90deg, ${teal(0.96)} 0%, ${teal(0.88)} 35%, ${teal(0.55)} 65%, ${teal(0.15)} 100%)`
}

export async function GovernanceHero({ hero }: { hero?: GovHero } = {}) {
  const data = hero ?? (await getGovHero())
  const {
    eyebrow,
    headingLine1,
    headingLine2,
    headingHighlight,
    description,
    ctaLabel,
    ctaHref,
    trust1,
    trust2,
    trust3,
    statement,
    showStatement,
    desktopImage,
    mobileImage,
    desktopPosition,
    mobilePosition,
    imageAlt,
    overlay,
  } = data

  const trust = [
    { icon: ShieldCheck, label: trust1 },
    { icon: UsersRound, label: trust2 },
    { icon: TrendingUp, label: trust3 },
  ].filter((t) => t.label?.trim())

  const statementLines = statement.split("\n").filter(Boolean)

  return (
    <section className="relative isolate flex min-h-[680px] items-center overflow-hidden bg-navy md:min-h-[440px] lg:min-h-[480px]">
      {/* Mobile-cropped background */}
      <Image
        src={mobileImage || desktopImage || "/images/hero-islamabad.png"}
        alt={imageAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover md:hidden"
        style={{ objectPosition: mobilePosition || "center" }}
      />
      {/* Desktop background */}
      <Image
        src={desktopImage || "/images/hero-islamabad.png"}
        alt={imageAlt}
        fill
        priority
        sizes="100vw"
        className="hidden object-cover md:block"
        style={{ objectPosition: desktopPosition || "center" }}
      />

      {/* Directional teal overlay (left dark → right light) */}
      <div aria-hidden className="absolute inset-0" style={{ background: overlayGradient(overlay) }} />
      {/* Extra darkening on mobile for readability */}
      <div aria-hidden className="absolute inset-0 bg-navy-dark/45 md:hidden" />

      <div className="relative mx-auto flex w-full max-w-7xl items-center px-5 py-14 sm:px-8 md:py-16 lg:px-12">
        <div className="w-full md:max-w-[60%] lg:max-w-[46%]">
          <p className="text-sm font-bold uppercase tracking-[0.04em] text-green sm:text-base">{eyebrow}</p>

          <h1 className="mt-4 text-pretty font-serif text-[2.35rem] font-bold leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
            {headingLine1}
            {headingLine2 ? (
              <>
                <br />
                {headingLine2}
              </>
            ) : null}
            {headingHighlight ? (
              <>
                <br />
                <span className="text-green">{headingHighlight}</span>
              </>
            ) : null}
          </h1>

          <p className="mt-5 max-w-[600px] text-pretty text-base leading-relaxed text-white/85 sm:text-[1.15rem]">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-7 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-5">
            <Link
              href={ctaHref || "/membership"}
              className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-lg bg-green px-7 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-[56px]"
            >
              {ctaLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>

            {trust.length > 0 && (
              <ul className="grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3">
                {trust.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-2.5 sm:text-left">
                    <Icon className="size-7 shrink-0 text-green sm:size-6" aria-hidden />
                    <span className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-white sm:text-xs">
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Right-side brand statement */}
      {showStatement && statementLines.length > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-[52%] top-1/2 hidden -translate-y-1/2 lg:block xl:left-[48%]"
        >
          <div className="border-l-[3px] border-green pl-4">
            <p className="text-base font-medium uppercase leading-[1.45] tracking-wide text-white lg:text-lg">
              {statementLines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
