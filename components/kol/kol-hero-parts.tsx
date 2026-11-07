import { Bitcoin, Boxes, ChartNoAxesCombined, Coins, Layers, Megaphone, Scale, ShieldCheck, Sparkles, Star, type LucideIcon } from "lucide-react"

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

export function ExpertiseIcons({ topics }: { topics: string[] }) {
  if (topics.length === 0) return null
  return (
    <ul className="flex flex-wrap items-stretch divide-x divide-line-light" aria-label="Areas of expertise">
      {topics.slice(0, 5).map((topic) => {
        const Icon = topicIcon(topic)
        return (
          <li key={topic} className="flex flex-col items-center gap-1.5 px-3 first:pl-0 last:pr-0">
            <Icon className="size-6 text-green" strokeWidth={1.75} aria-hidden="true" />
            <span className="text-center text-xs font-semibold text-heading">{topic}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function KolVerifiedSeal() {
  return (
    <div className="relative flex h-40 w-36 shrink-0 items-center justify-center drop-shadow-lg" role="img" aria-label="KOL verified by VAAP">
      <svg viewBox="0 0 120 140" className="absolute inset-0 size-full" aria-hidden="true">
        <path
          d="M60 4 L112 22 V66 C112 100 90 124 60 136 C30 124 8 100 8 66 V22 Z"
          className="fill-gold"
        />
        <path
          d="M60 12 L104 27.5 V66 C104 95 85.5 116 60 127 C34.5 116 16 95 16 66 V27.5 Z"
          className="fill-green"
        />
        <path
          d="M60 18 L98 31.5 V66 C98 91 82 109.5 60 119.5 C38 109.5 22 91 22 66 V31.5 Z"
          className="fill-none stroke-gold/50"
          strokeWidth="1"
        />
      </svg>
      <div className="relative flex flex-col items-center pb-3">
        <ShieldCheck className="mb-1 size-5 text-gold" aria-hidden="true" />
        <span className="font-serif text-3xl font-black leading-none text-gold">KOL</span>
        <span className="mt-1 text-xs font-bold uppercase tracking-widest text-gold">Verified</span>
        <span className="mt-1.5 flex gap-0.5 text-gold" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Star key={i} className="size-3 fill-gold" />
          ))}
        </span>
      </div>
    </div>
  )
}
