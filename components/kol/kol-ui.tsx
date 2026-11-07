import { BadgeCheck, Globe, Send } from "lucide-react"
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TiktokIcon,
  XIcon,
  YoutubeIcon,
} from "@/components/social-icons"
import { cn } from "@/lib/utils"
import { KOL_STATUS_LABEL, KOL_STATUS_TONE, platformLabel, type KolStatus } from "@/lib/kol-shared"

export function VerifiedBadge({ className, label = "Verified KOL" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 text-green", className)} title={label}>
      <BadgeCheck className="size-5 fill-green text-card" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

const PLATFORM_STYLE: Record<string, { Icon: (p: { className?: string }) => React.ReactNode; tone: string }> = {
  linkedin: { Icon: LinkedinIcon, tone: "bg-[#0a66c2] text-card" },
  x: { Icon: XIcon, tone: "bg-foreground text-card" },
  youtube: { Icon: YoutubeIcon, tone: "bg-[#ff0000] text-card" },
  instagram: { Icon: InstagramIcon, tone: "bg-[#d62976] text-card" },
  tiktok: { Icon: TiktokIcon, tone: "bg-foreground text-card" },
  facebook: { Icon: FacebookIcon, tone: "bg-[#1877f2] text-card" },
  telegram: { Icon: Send, tone: "bg-[#229ed9] text-card" },
}

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const style = PLATFORM_STYLE[platform] ?? { Icon: Globe, tone: "bg-muted-2 text-card" }
  const { Icon } = style
  return (
    <span
      className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-md", style.tone, className)}
      aria-hidden="true"
    >
      <Icon className="size-3.5" />
    </span>
  )
}

export function PlatformName({ platform }: { platform: string }) {
  return <span className="sr-only">{platformLabel(platform)}</span>
}

export function KolStatusPill({ status, className }: { status: string; className?: string }) {
  const s = status as KolStatus
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        KOL_STATUS_TONE[s] ?? "bg-surface text-body",
        className,
      )}
    >
      {KOL_STATUS_LABEL[s] ?? status}
    </span>
  )
}
