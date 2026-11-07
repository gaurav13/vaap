export const SOCIAL_PLATFORMS = [
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/…" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/…" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@…" },
  { key: "threads", label: "Threads", placeholder: "https://threads.net/@…" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/…" },
  { key: "discord", label: "Discord", placeholder: "https://discord.gg/…" },
  { key: "whatsapp", label: "WhatsApp channel", placeholder: "https://whatsapp.com/channel/…" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/…" },
  { key: "medium", label: "Medium", placeholder: "https://medium.com/@…" },
  { key: "reddit", label: "Reddit", placeholder: "https://reddit.com/r/…" },
  { key: "wikipedia", label: "Wikipedia", placeholder: "https://en.wikipedia.org/wiki/…" },
] as const

export type SocialKey = (typeof SOCIAL_PLATFORMS)[number]["key"]
export type SocialLinks = Record<SocialKey, string>

export const DEFAULT_SOCIAL = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p.key, ""])) as SocialLinks
