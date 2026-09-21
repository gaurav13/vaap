"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import type { NewsAlert, NewsAlertColor } from "@/lib/site-settings"

// Static class strings per theme so Tailwind keeps them at build time.
const COLORS: Record<
  NewsAlertColor,
  { bar: string; text: string; dot: string; ping: string; link: string; dismiss: string }
> = {
  green: {
    bar: "bg-green text-white",
    text: "text-white/90",
    dot: "bg-mint",
    ping: "bg-mint/70",
    link: "text-white decoration-mint/70 hover:text-mint hover:decoration-mint",
    dismiss: "text-white/70 hover:bg-white/10 hover:text-white",
  },
  mint: {
    bar: "bg-mint text-green",
    text: "text-green/90",
    dot: "bg-green",
    ping: "bg-green/50",
    link: "text-green decoration-green/40 hover:text-green-hover hover:decoration-green",
    dismiss: "text-green/60 hover:bg-green/10 hover:text-green",
  },
  blue: {
    bar: "bg-[#e6ecfb] text-navy",
    text: "text-navy/90",
    dot: "bg-navy",
    ping: "bg-navy/40",
    link: "text-navy decoration-navy/40 hover:text-navy/70 hover:decoration-navy",
    dismiss: "text-navy/60 hover:bg-navy/10 hover:text-navy",
  },
  sand: {
    bar: "bg-gold-tint text-gold",
    text: "text-gold/90",
    dot: "bg-gold",
    ping: "bg-gold/40",
    link: "text-gold decoration-gold/40 hover:text-gold/70 hover:decoration-gold",
    dismiss: "text-gold/70 hover:bg-gold/10 hover:text-gold",
  },
  rose: {
    bar: "bg-[#fbeaec] text-[#8f1d2b]",
    text: "text-[#8f1d2b]/90",
    dot: "bg-[#8f1d2b]",
    ping: "bg-[#8f1d2b]/40",
    link: "text-[#8f1d2b] decoration-[#8f1d2b]/40 hover:text-[#8f1d2b]/70 hover:decoration-[#8f1d2b]",
    dismiss: "text-[#8f1d2b]/60 hover:bg-[#8f1d2b]/10 hover:text-[#8f1d2b]",
  },
  charcoal: {
    bar: "bg-[#2f3540] text-white",
    text: "text-white/90",
    dot: "bg-white",
    ping: "bg-white/60",
    link: "text-white decoration-white/60 hover:text-white hover:decoration-white",
    dismiss: "text-white/70 hover:bg-white/10 hover:text-white",
  },
  slate: {
    bar: "bg-[#e9ebef] text-[#3a4250]",
    text: "text-[#3a4250]/90",
    dot: "bg-[#3a4250]",
    ping: "bg-[#3a4250]/40",
    link: "text-[#3a4250] decoration-[#3a4250]/40 hover:text-[#3a4250]/70 hover:decoration-[#3a4250]",
    dismiss: "text-[#3a4250]/60 hover:bg-[#3a4250]/10 hover:text-[#3a4250]",
  },
  violet: {
    bar: "bg-[#ece7fb] text-[#5b3fb0]",
    text: "text-[#5b3fb0]/90",
    dot: "bg-[#5b3fb0]",
    ping: "bg-[#5b3fb0]/40",
    link: "text-[#5b3fb0] decoration-[#5b3fb0]/40 hover:text-[#5b3fb0]/70 hover:decoration-[#5b3fb0]",
    dismiss: "text-[#5b3fb0]/60 hover:bg-[#5b3fb0]/10 hover:text-[#5b3fb0]",
  },
}

function isExternal(href: string) {
  return /^(https?:)?\/\//.test(href) || /^(mailto:|tel:)/.test(href)
}

// Stable per-announcement key so a NEW alert re-appears even when a previous
// one was dismissed in this browser session.
function alertKey(a: NewsAlert) {
  let hash = 0
  const raw = `${a.message}|${a.linkHref}|${a.linkLabel}`
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0
  }
  return `vaap:news-alert:${hash}`
}

export function NewsAlertBar({ alert }: { alert: NewsAlert | null }) {
  // Start visible so fresh visitors see it on first paint (matches SSR); the
  // effect hides it only if this exact announcement was already dismissed.
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!alert?.enabled || !alert.message.trim() || !alert.dismissible) return
    try {
      if (sessionStorage.getItem(alertKey(alert)) === "1") setDismissed(true)
    } catch {
      /* sessionStorage unavailable — keep the alert visible */
    }
  }, [alert])

  if (!alert?.enabled || !alert.message.trim() || dismissed) return null

  const hasLink = alert.linkHref.trim().length > 0 && alert.linkLabel.trim().length > 0
  const external = hasLink && isExternal(alert.linkHref)
  const theme = COLORS[alert.color] ?? COLORS.green
  const linkCls = `ml-1.5 inline-flex items-center gap-1 font-semibold underline underline-offset-4 transition-colors ${theme.link}`

  function dismiss() {
    setDismissed(true)
    if (!alert) return
    try {
      sessionStorage.setItem(alertKey(alert), "1")
    } catch {
      /* ignore persistence failures */
    }
  }

  return (
    <div className={`relative ${theme.bar}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2.5 px-11 py-2.5 text-center lg:px-14">
        <span aria-hidden className="relative hidden size-2 shrink-0 sm:block">
          <span className={`absolute inset-0 animate-ping rounded-full ${theme.ping}`} />
          <span className={`absolute inset-0 rounded-full ${theme.dot}`} />
        </span>
        <p className={`text-[13px] font-medium leading-snug text-pretty ${theme.text}`}>
          <span>{alert.message}</span>
          {hasLink &&
            (external ? (
              <a href={alert.linkHref} target="_blank" rel="noopener noreferrer" className={linkCls}>
                {alert.linkLabel}
                <span aria-hidden>&rarr;</span>
              </a>
            ) : (
              <Link href={alert.linkHref} className={linkCls}>
                {alert.linkLabel}
                <span aria-hidden>&rarr;</span>
              </Link>
            ))}
        </p>
      </div>

      {alert.dismissible && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
