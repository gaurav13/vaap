import type { SocialLinks } from "@/lib/site-settings"
import { cn } from "@/lib/utils"
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon, XIcon, YoutubeIcon } from "@/components/social-icons"

export function FollowVaap({
  social,
  title = "Follow VAAP",
  stacked = false,
  className,
}: {
  social: SocialLinks
  title?: string
  stacked?: boolean
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

  return (
    <div
      className={cn(
        "flex flex-wrap gap-4 rounded-3xl border border-line bg-card px-6 py-5 shadow-md",
        stacked ? "flex-col items-start" : "items-center",
        className,
      )}
    >
      <p className="text-lg font-bold text-heading">{title}</p>
      {!stacked && <span className="hidden h-8 w-px bg-line sm:block" aria-hidden="true" />}
      <ul className="flex flex-wrap items-center gap-2">
        {socials.map(({ Icon, href, label }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`VAAP on ${label} (opens in a new tab)`}
              className="flex size-10 items-center justify-center rounded-xl bg-green text-white shadow-sm transition-colors hover:bg-navy"
            >
              <Icon className="size-[18px]" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
