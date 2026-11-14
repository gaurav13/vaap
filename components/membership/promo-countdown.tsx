"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock } from "lucide-react"

function remaining(endsAt: string, now: number) {
  const ms = Math.max(0, new Date(endsAt).getTime() - now)
  const s = Math.floor(ms / 1000)
  return { ms, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 }
}

const pad = (n: number) => String(n).padStart(2, "0")

/** Ticks down to the end of an offer, then refreshes so standard prices return. */
export function PromoCountdown({ endsAt, tone = "light", className = "" }: { endsAt: string; tone?: "light" | "dark"; className?: string }) {
  const router = useRouter()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const left = now === null ? null : remaining(endsAt, now)
  const ended = left !== null && left.ms <= 0

  useEffect(() => {
    if (ended) router.refresh()
  }, [ended, router])

  if (left === null || ended) return null

  const text =
    left.days > 0
      ? `${left.days}d ${pad(left.hours)}h ${pad(left.minutes)}m`
      : `${pad(left.hours)}:${pad(left.minutes)}:${pad(left.seconds)}`

  return (
    <p
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone === "dark" ? "text-white/90" : "text-gold"} ${className}`}
    >
      <Clock className="size-3.5" aria-hidden />
      <span>
        Offer ends in <span className="font-mono tabular-nums">{text}</span>
      </span>
    </p>
  )
}
