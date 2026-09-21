"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  GraduationCap,
  Landmark,
  Rocket,
  Settings,
  ShieldCheck,
  Star,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { Membership } from "@/lib/site-settings"

const ICONS: Record<string, LucideIcon> = {
  Building2,
  Users,
  Rocket,
  ShieldCheck,
  User,
  GraduationCap,
  Landmark,
}

function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Building2
}

// Highlight flagship plans (Corporate + the two Verified memberships) in gold.
function isFeatured(title: string): boolean {
  const t = title.toLowerCase()
  return t.includes("corporate") || t.includes("verified")
}

// Eligibility rows are plain text in the DB; cycle a small, consistent icon set.
const ELIGIBILITY_ICONS: LucideIcon[] = [Settings, FileText, ShieldCheck, User]

export type MembershipPlan = {
  id: number
  icon: string
  title: string
  subtitle: string
  description: string
  annualFee: string
  annualFeeNote: string
  admissionFee: string
  admissionFeeNote: string
  term: string
  benefits: string[]
  eligibility: string[]
}

const CONTENT_FONT_CLASS: Record<Membership["contentFont"], string> = {
  sans: "font-sans",
  serif: "font-serif",
}

const CONTENT_SIZE_CLASS: Record<Membership["contentSize"], string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
}

function PlanDetail({
  plan,
  compact = false,
  contentFont,
  contentSize,
  eligibilityFont,
  eligibilitySize,
}: {
  plan: MembershipPlan
  compact?: boolean
  contentFont: Membership["contentFont"]
  contentSize: Membership["contentSize"]
  eligibilityFont: Membership["eligibilityFont"]
  eligibilitySize: Membership["eligibilitySize"]
}) {
  const Icon = iconFor(plan.icon)
  const bodyFont = CONTENT_FONT_CLASS[contentFont]
  const bodySize = compact ? "text-sm" : CONTENT_SIZE_CLASS[contentSize]
  const eligFont = CONTENT_FONT_CLASS[eligibilityFont]
  const eligSize = CONTENT_SIZE_CLASS[eligibilitySize]

  const fees: { label: string; value: string; note?: string; icon: LucideIcon }[] = []
  if (plan.annualFee)
    fees.push({ label: "Annual Fee", value: plan.annualFee, note: plan.annualFeeNote || undefined, icon: CalendarDays })
  if (plan.admissionFee)
    fees.push({
      label: "Admission Fee (One-time)",
      value: plan.admissionFee,
      note: plan.admissionFeeNote || undefined,
      icon: FilePlus2,
    })
  if (plan.term) fees.push({ label: "Membership Term", value: plan.term, icon: CalendarClock })

  return (
    <div>
      {!compact && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-green">{plan.title}</p>
              <span className="hidden h-px w-10 bg-green/40 sm:block" aria-hidden />
            </div>
            <h3 className="mt-3 font-serif text-2xl font-bold leading-tight text-heading xl:text-3xl">
              {plan.subtitle}
            </h3>
          </div>
          <span className="hidden size-16 shrink-0 items-center justify-center rounded-full bg-mint text-green lg:flex">
            <Icon className="size-8" aria-hidden />
          </span>
        </div>
      )}

      <p className={`text-body leading-relaxed ${compact ? "text-sm" : "mt-5"}`}>{plan.description}</p>

      {fees.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {fees.map((fee) => {
            const FeeIcon = fee.icon
            return (
              <div key={fee.label} className="flex items-center gap-3 rounded-xl border border-line bg-muted/40 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
                  <FeeIcon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium leading-tight text-body">{fee.label}</p>
                  <p className="font-serif text-lg font-bold leading-tight text-heading">{fee.value}</p>
                  {fee.note && <p className="text-[11px] leading-tight text-muted-foreground">({fee.note})</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h4 className="font-serif text-xl font-bold text-green">Key Benefits</h4>
          <ul className="mt-4 space-y-3">
            {plan.benefits.map((benefit) => (
              <li key={benefit} className="flex gap-3 text-sm leading-relaxed text-body">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green text-white">
                  <Check className="size-3" aria-hidden />
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:border-l md:border-line md:pl-8">
          <h4 className="font-serif text-xl font-bold text-green">Eligibility Criteria</h4>
          <ul className="mt-4 space-y-4">
            {plan.eligibility.map((text, i) => {
              const EligIcon = ELIGIBILITY_ICONS[i % ELIGIBILITY_ICONS.length]
              return (
                <li key={text} className={`flex items-center gap-3 leading-relaxed text-body ${eligFont} ${eligSize}`}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-green">
                    <EligIcon className="size-5" aria-hidden />
                  </span>
                  <span>{text}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
              href="/membership/apply"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-green px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green/90"
        >
          Apply Now
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  )
}

export function MembershipTypes({ plans, header }: { plans: MembershipPlan[]; header: Membership }) {
  const [active, setActive] = useState(0)

  if (plans.length === 0) {
    return (
      <section id="categories" className="bg-background">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
          <p className="text-body">Membership plans will appear here once they are published.</p>
        </div>
      </section>
    )
  }

  const statementLines = header.statement.split("\n").filter(Boolean)

  return (
    <section id="categories" className="relative overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        {/* Header */}
        <div className="relative min-h-[200px] lg:min-h-[240px]">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-3/5 overflow-hidden md:block">
            <Image
              src="/images/hero-islamabad.png"
              alt=""
              fill
              priority={false}
              className="object-cover object-right opacity-25"
              sizes="60vw"
            />
            {/* Fade the photo into the background on the left, bottom, and right so it reads as a soft watermark */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-l from-background/90 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-gold/60" aria-hidden />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{header.eyebrow}</p>
            </div>
            <h2 className="mt-4 fluid-h2 font-bold text-heading">
              {header.heading}
            </h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-body">{header.description}</p>
          </div>

          {header.showStatement && statementLines.length > 0 && (
            <div className="absolute right-0 top-1 z-10 hidden items-start lg:flex">
              <span className="mr-4 mt-1 h-24 w-px bg-gold/50" aria-hidden />
              <p className="font-sans text-[11px] font-semibold uppercase leading-[1.9] tracking-[0.22em] text-heading/90">
                {statementLines.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < statementLines.length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>

        {/* Desktop: vertical tabs */}
        <div className="mt-10 hidden overflow-hidden rounded-3xl border border-line bg-card shadow-xl lg:block">
          <div className="grid lg:grid-cols-[300px_1fr]">
            <div className="flex flex-col gap-2 border-r border-line bg-muted/20 p-5">
              {plans.map((plan, i) => {
                const Icon = iconFor(plan.icon)
                const isActive = i === active
                const featured = isFeatured(plan.title)
                const activeClass = "bg-green text-white shadow-sm"
                const idleClass = featured
                  ? "bg-card text-heading ring-1 ring-gold/40 hover:bg-gold/5"
                  : "text-heading hover:bg-mint"
                const iconActiveClass = "bg-white/15 text-white"
                const iconIdleClass = featured
                  ? "bg-gold/10 text-gold"
                  : "bg-mint text-green group-hover:bg-white"
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={isActive}
                    className={`group flex items-center gap-3 rounded-xl p-3.5 text-left transition-colors ${
                      isActive ? activeClass : idleClass
                    }`}
                  >
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isActive ? iconActiveClass : iconIdleClass
                      }`}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="flex-1 text-sm font-semibold leading-snug">
                      {plan.title}
                      {featured && (
                        <span
                          className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                            isActive ? "border-white/40 text-white/90" : "border-gold/40 text-gold"
                          }`}
                        >
                          <Star className="size-2.5 fill-current" aria-hidden />
                          Featured
                        </span>
                      )}
                    </span>
                    <ChevronRight
                      className={`size-4 shrink-0 ${isActive ? "text-white" : "text-muted-foreground"}`}
                      aria-hidden
                    />
                  </button>
                )
              })}
            </div>

            <div className="p-8 xl:p-10">
              <PlanDetail
                plan={plans[active] ?? plans[0]}
                contentFont={header.contentFont}
                contentSize={header.contentSize}
                eligibilityFont={header.eligibilityFont}
                eligibilitySize={header.eligibilitySize}
              />
            </div>
          </div>
        </div>

        {/* Mobile: accordion */}
        <div className="mt-8 space-y-3 lg:hidden">
          {plans.map((plan, i) => {
            const Icon = iconFor(plan.icon)
            const isOpen = i === active
            const featured = isFeatured(plan.title)
            return (
              <div
                key={plan.id}
                className={`overflow-hidden rounded-2xl border bg-card shadow-sm ${
                  featured ? "border-gold/40" : "border-line"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActive(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center gap-3 p-4 text-left transition-colors ${
                    isOpen ? "bg-green text-white" : "text-heading"
                  }`}
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
                      isOpen ? "bg-white/15 text-white" : featured ? "bg-gold/10 text-gold" : "bg-mint text-green"
                    }`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-serif text-base font-bold leading-tight">
                      {plan.title}
                      {featured && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                            isOpen ? "border-white/40 text-white/90" : "border-gold/40 text-gold"
                          }`}
                        >
                          <Star className="size-2.5 fill-current" aria-hidden />
                          Featured
                        </span>
                      )}
                    </span>
                    <span className={`mt-0.5 block text-xs leading-tight ${isOpen ? "text-white/80" : "text-body"}`}>
                      {plan.subtitle}
                    </span>
                  </span>
                  <ChevronDown
                    className={`size-5 shrink-0 transition-transform ${isOpen ? "rotate-180 text-white" : "text-muted-foreground"}`}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-line p-5">
                    <PlanDetail
                      plan={plan}
                      compact
                      contentFont={header.contentFont}
                      contentSize={header.contentSize}
                      eligibilityFont={header.eligibilityFont}
                      eligibilitySize={header.eligibilitySize}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bottom tagline */}
        <div className="mt-6 hidden items-center justify-end gap-4 lg:flex">
          <span className="h-px w-16 bg-gold/40" aria-hidden />
          <p className="text-right text-[11px] font-semibold uppercase leading-tight tracking-[0.22em] text-gold">
            A United Industry
            <br />
            For a Digital Pakistan
          </p>
        </div>
      </div>
    </section>
  )
}
