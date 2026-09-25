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
}: {
  closesAt: string
  compact?: boolean
}) {
  const target = new Date(closesAt).getTime()
  const [t, setT] = useState(() => diff(target))

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (t.ms <= 0) {
    return <span className="text-sm font-semibold text-muted-2">Voting closed</span>
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
    <div className="grid grid-cols-4 gap-2">
      {cells.map((c) => (
        <div key={c.label} className="rounded-xl border border-line bg-background p-2.5 text-center">
          <p className="font-mono text-2xl font-bold tabular-nums text-heading">{String(c.value).padStart(2, "0")}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-2">{c.label}</p>
        </div>
      ))}
    </div>
  )
}
