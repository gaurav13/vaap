import Link from "next/link"
import {
  ArrowRight,
  ChevronRight,
  Blocks,
  CreditCard,
  FileText,
  Globe,
  GraduationCap,
  Megaphone,
  Rocket,
  ShieldCheck,
  Coins,
  type LucideIcon,
} from "lucide-react"

type Committee = { id: number; name: string; description: string }

const FALLBACK = [
  "Policy & Regulatory Affairs",
  "Compliance, AML & Consumer Protection",
  "Virtual Asset Services",
  "Blockchain & Technology",
  "Stablecoins, Payments & Tokenization",
  "Startup & Innovation",
  "Education & Community",
  "International Relations",
  "Media & Communications",
]

function iconFor(name: string): LucideIcon {
  const n = name.toLowerCase()
  if (n.includes("policy") || n.includes("regulat")) return FileText
  if (n.includes("compliance") || n.includes("aml") || n.includes("consumer")) return ShieldCheck
  if (n.includes("service")) return Coins
  if (n.includes("blockchain") || n.includes("technology")) return Blocks
  if (n.includes("stablecoin") || n.includes("payment") || n.includes("token")) return CreditCard
  if (n.includes("startup") || n.includes("innovation")) return Rocket
  if (n.includes("education") || n.includes("community")) return GraduationCap
  if (n.includes("international")) return Globe
  if (n.includes("media") || n.includes("communication")) return Megaphone
  return FileText
}

export function CommitteeGrid({ committees }: { committees: Committee[] }) {
  const items =
    committees.length > 0
      ? committees.map((c) => ({ key: String(c.id), name: c.name }))
      : FALLBACK.map((name) => ({ key: name, name }))

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green">Industry Expertise</p>
            <h2 className="mt-3 text-pretty text-3xl font-bold tracking-tight text-heading sm:text-4xl">
              Industry-Led Committees
            </h2>
            <p className="mt-3 max-w-3xl text-pretty text-base leading-relaxed text-body">
              Specialized committees allow members and experts to contribute knowledge across key areas of the
              ecosystem.
            </p>
          </div>
          <Link
            href="/community"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-green transition-colors hover:text-green-hover"
          >
            View All Committees
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <ul className="mt-10 grid gap-3 lg:grid-cols-3">
          {items.map(({ key, name }) => {
            const Icon = iconFor(name)
            return (
              <li key={key}>
                <Link
                  href="/community"
                  className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3.5 transition-colors hover:border-green-border hover:bg-mint-2"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-heading">{name}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-2" />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
