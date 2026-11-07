import { Bitcoin, Boxes, ChartNoAxesCombined, Coins, Crown, Layers, Megaphone, Scale, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react"

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
            className="inline-flex items-center gap-2 rounded-full border border-line-light bg-card px-3 py-1.5 text-xs font-semibold text-heading shadow-sm shadow-heading/5 sm:px-4 sm:py-2 sm:text-sm"
          >
            <Icon className="size-4 text-green" strokeWidth={2.25} aria-hidden="true" />
            {topic}
          </li>
        )
      })}
    </ul>
  )
}

const CENTER = 60
const RADIUS = 47
const LEAVES = Array.from({ length: 9 }, (_, i) => {
  const deg = 112 + i * 17
  const rad = (deg * Math.PI) / 180
  return {
    x: CENTER + RADIUS * Math.cos(rad),
    y: CENTER + RADIUS * Math.sin(rad),
    rotate: deg + 90 - 28,
    scale: 1 - i * 0.045,
  }
})

function LaurelBranch({ mirrored }: { mirrored?: boolean }) {
  return (
    <g transform={mirrored ? `translate(${CENTER * 2} 0) scale(-1 1)` : undefined}>
      <path
        d={`M ${CENTER - 18} ${CENTER + 44} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER - 30} ${CENTER - 36}`}
        className="fill-none stroke-gold"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {LEAVES.map((leaf, i) => (
        <ellipse
          key={i}
          cx={leaf.x}
          cy={leaf.y}
          rx={7.5 * leaf.scale}
          ry={3 * leaf.scale}
          transform={`rotate(${leaf.rotate} ${leaf.x} ${leaf.y})`}
          className="fill-gold"
        />
      ))}
    </g>
  )
}

export function KolVerifiedSeal({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex size-36 shrink-0 items-center justify-center ${className}`}
      role="img"
      aria-label="VAAP KOL verified"
    >
      <svg viewBox="0 0 120 120" className="absolute inset-0 size-full" aria-hidden="true">
        <LaurelBranch />
        <LaurelBranch mirrored />
      </svg>
      <Crown className="absolute top-1 size-5 fill-gold text-gold" aria-hidden="true" />
      <div className="relative flex flex-col items-center leading-none">
        <span className="text-4xl font-black tracking-tight text-green">KOL</span>
        <span className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-green">Verified</span>
      </div>
      <span className="absolute bottom-1 flex size-6 items-center justify-center rounded-full bg-green text-card shadow-md ring-2 ring-card">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
      </span>
    </div>
  )
}
