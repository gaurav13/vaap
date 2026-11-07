import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { SocialLinks } from "@/lib/site-settings"
import { cn } from "@/lib/utils"
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon, XIcon, YoutubeIcon } from "@/components/social-icons"

export function FollowVaap({
  social,
  title = "Follow VAAP",
  stacked = false,
  variant = "light",
  cta,
  className,
}: {
  social: SocialLinks
  title?: string
  stacked?: boolean
  variant?: "light" | "dark"
  cta?: { label: string; href: string }
  className?: string
}) {
  const socials = [
    { Icon: LinkedinIcon, href: social.linkedin, label: "LinkedIn" },
    { Icon: XIcon, href: social.x, label: "X" },
    { Icon: YoutubeIcon, href: social.youtube, label: "YouTube" },
    { Icon: InstagramIcon, href: social.instagram, label: "Instagram" },
    { Icon: FacebookIcon, href: social.facebook, label: "Facebook" },
    { Icon: TiktokIcon, href: social.tiktok, label: "TikTok" },
  ].filter((s) => s.href)

  if (socials.length === 0) return null

  const dark = variant === "dark"

  return (
    <div
      className={cn(
        "flex flex-wrap gap-4 rounded-3xl px-6 py-5",
        dark ? "bg-green-hover text-white shadow-lg sm:px-8" : "border border-line bg-card shadow-md",
        stacked ? "flex-col items-start" : "items-center",
        className,
      )}
    >
      <p className={cn("text-lg font-bold", dark ? "text-white lg:text-xl" : "text-heading")}>{title}</p>
      {!stacked && (
        <span className={cn("hidden h-8 w-px sm:block", dark ? "bg-white/30" : "bg-line")} aria-hidden="true" />
      )}
      <ul className="flex flex-wrap items-center gap-2 sm:gap-3">
        {socials.map(({ Icon, href, label }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`VAAP on ${label} (opens in a new tab)`}
              className={cn(
                "flex size-10 items-center justify-center shadow-sm transition-colors",
                dark
                  ? "rounded-full bg-white text-green-hover hover:bg-mint"
                  : "rounded-xl bg-green text-white hover:bg-navy",
              )}
            >
              <Icon className="size-[18px]" />
            </a>
          </li>
        ))}
      </ul>
      {cta && (
        <div className="flex items-center gap-4 lg:ml-auto">
          <span className={cn("hidden h-8 w-px lg:block", dark ? "bg-white/30" : "bg-line")} aria-hidden="true" />
          <Link
            href={cta.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors",
              dark
                ? "border-white/80 text-white hover:bg-white hover:text-green-hover"
                : "border-green text-green hover:bg-green hover:text-white",
            )}
          >
            {cta.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  )
}
