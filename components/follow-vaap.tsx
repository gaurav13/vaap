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

  if (stacked) {
    return (
      <div
        className={cn(
          "flex flex-col gap-5 rounded-2xl p-6",
          dark ? "bg-[#2b2f33] text-white shadow-lg" : "border border-line bg-card shadow-md",
          className,
        )}
      >
        <div className="flex flex-col gap-1">
          <p className={cn("font-serif text-lg font-bold", dark ? "text-white" : "text-heading")}>{title}</p>
          <p className={cn("text-sm leading-relaxed", dark ? "text-white/70" : "text-muted-2")}>
            Get event updates, briefings and industry news.
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-2">
          {socials.map(({ Icon, href, label }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`VAAP on ${label} (opens in a new tab)`}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full transition-colors",
                  dark ? "bg-white/10 text-white hover:bg-white hover:text-[#2b2f33]" : "bg-green text-white hover:bg-navy",
                )}
              >
                <Icon className="size-[18px]" />
              </a>
            </li>
          ))}
        </ul>
        {cta && (
          <Link
            href={cta.href}
            className={cn(
              "inline-flex w-full items-center justify-between gap-2 rounded-xl border-t px-4 py-3 text-sm font-semibold transition-colors",
              dark
                ? "border-white/10 bg-white/5 text-white hover:bg-white hover:text-[#2b2f33]"
                : "border-line bg-mint text-green hover:bg-green hover:text-white",
            )}
          >
            <span className="text-pretty">{cta.label}</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:rounded-2xl sm:px-6 sm:py-4",
        dark ? "bg-[#2b2f33] text-white shadow-md sm:px-8" : "border border-line bg-card shadow-sm",
        className,
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-widest sm:text-base sm:normal-case sm:tracking-normal sm:font-bold",
          dark ? "text-white/70 sm:text-white lg:text-lg" : "text-muted-2 sm:text-heading",
        )}
      >
        {title}
      </p>
      <span className={cn("hidden h-6 w-px sm:block", dark ? "bg-white/20" : "bg-line")} aria-hidden="true" />
      <ul className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {socials.map(({ Icon, href, label }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`VAAP on ${label} (opens in a new tab)`}
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors sm:size-9",
                dark
                  ? "bg-white/10 text-white hover:bg-white hover:text-[#2b2f33]"
                  : "bg-mint text-green hover:bg-green hover:text-white",
              )}
            >
              <Icon className="size-4" />
            </a>
          </li>
        ))}
      </ul>
      {cta && (
        <Link
          href={cta.href}
          className={cn(
            "group flex items-center justify-between gap-3 border-t pt-3 text-xs font-medium transition-colors sm:ml-auto sm:border-t-0 sm:pt-0 sm:text-sm",
            dark ? "border-white/10 text-white/80 hover:text-white" : "border-line text-green hover:text-navy",
          )}
        >
          <span className="text-pretty">{cta.label}</span>
          <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
