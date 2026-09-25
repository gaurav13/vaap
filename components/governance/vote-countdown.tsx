"use client"

import { useEffect, useState } from "react"

function diff(target: number) {
  const now = Date.now()
  const ms = Math.max(target - now, 0)
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return { ms, days, hours, minutes, seconds }
}

export function VoteCountdown({
  closesAt,
  compact = false,
  tone = "light",
}: {
  closesAt: string
  compact?: boolean
  tone?: "light" | "dark"
}) {
  const target = new Date(closesAt).getTime()
  const [t, setT] = useState(() => diff(target))

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  const dark = tone === "dark"

  if (t.ms <= 0) {
    return (
      <span className={`text-sm font-semibold ${dark ? "text-primary-foreground/80" : "text-muted-2"}`}>
        Voting closed
      </span>
    )
  }

  if (compact) {
    return (
      <span className="font-mono text-sm font-semibold tabular-nums text-heading">
        {String(t.days).padStart(2, "0")}d : {String(t.hours).padStart(2, "0")}h : {String(t.minutes).padStart(2, "0")}m
      </span>
    )
  }

  const cells: { value: number; label: string }[] = [
    { value: t.days, label: "Days" },
    { value: t.hours, label: "Hours" },
    { value: t.minutes, label: "Minutes" },
    { value: t.seconds, label: "Seconds" },
  ]

  return (
    <div className="grid grid-cols-4 gap-2" role="timer" aria-live="off">
      {cells.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border p-2.5 text-center ${
            dark ? "border-primary-foreground/25 bg-primary-foreground/5" : "border-line bg-background"
          }`}
        >
          <p
            className={`text-3xl font-bold tabular-nums ${dark ? "text-primary-foreground" : "font-mono text-heading"}`}
          >
            {String(c.value).padStart(2, "0")}
          </p>
          <p
            className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${
              dark ? "text-primary-foreground/80" : "text-muted-2"
            }`}
          >
            {c.label}
          </p>
        </div>
      ))}
    </div>
  )
}
