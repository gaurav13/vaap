import { BadgeCheck, Bitcoin, Boxes, ChartNoAxesCombined, Coins, Layers, Megaphone, Scale, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react"

const TOPIC_ICONS: [RegExp, LucideIcon][] = [
  [/fintech|trading|market|analy/i, ChartNoAxesCombined],
  [/blockchain|defi|protocol/i, Boxes],
  [/bitcoin|crypto|digital asset|token/i, Bitcoin],
  [/web3|nft|metaverse/i, Layers],
  [/financ|invest|bank|wealth/i, Coins],
  [/regulat|policy|legal|compliance/i, Scale],
  [/security|audit/i, ShieldCheck],
  [/media|community|education|market/i, Megaphone],
]

function topicIcon(topic: string): LucideIcon {
  return TOPIC_ICONS.find(([re]) => re.test(topic))?.[1] ?? Sparkles
}

export function ExpertiseChips({ topics }: { topics: string[] }) {
  if (topics.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2 sm:gap-3" aria-label="Areas of expertise">
      {topics.slice(0, 5).map((topic) => {
        const Icon = topicIcon(topic)
        return (
          <li
            key={topic}
            className="inline-flex items-center gap-2 rounded-full border border-line-light/70 bg-card px-3 py-1.5 text-xs font-semibold text-heading shadow-md shadow-heading/5 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <Icon className="size-4 text-green" strokeWidth={2.25} aria-hidden="true" />
            {topic}
          </li>
        )
      })}
    </ul>
  )
}

export function ScallopedCheck({ className = "" }: { className?: string }) {
  return (
    <BadgeCheck
      className={`shrink-0 fill-green text-card drop-shadow-[0_3px_6px_rgb(0_0_0/0.2)] ${className}`}
      strokeWidth={2.25}
      aria-hidden="true"
    />
  )
}

export function KolVerifiedSeal({ className = "" }: { className?: string; id?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/kol-verified-seal.png"
      alt="VAAP KOL verified"
      className={`h-auto w-36 shrink-0 object-contain mix-blend-multiply ${className}`}
    />
  )
}
