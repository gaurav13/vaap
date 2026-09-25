"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

function remaining(target: number) {
  const ms = Math.max(0, target - Date.now())
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return { d, h, m, done: ms === 0 }
}

const pad = (n: number) => String(n).padStart(2, "0")

export function ClosesIn({ closesAt }: { closesAt: string }) {
  const target = new Date(closesAt).getTime()
  const [now, setNow] = useState<ReturnType<typeof remaining> | null>(null)

  useEffect(() => {
    setNow(remaining(target))
    const id = setInterval(() => setNow(remaining(target)), 30_000)
    return () => clearInterval(id)
  }, [target])

  const label = new Date(closesAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  })

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold-tint p-3">
      <Clock className="size-7 shrink-0 text-green" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-muted-2">{now?.done ? "Voting closed" : "Closes in"}</p>
        <p className="font-mono text-lg font-bold tabular-nums text-heading" aria-live="polite">
          {now ? `${pad(now.d)}d : ${pad(now.h)}h : ${pad(now.m)}m` : "--d : --h : --m"}
        </p>
        <p className="text-xs text-muted-2">{label} (PKT)</p>
      </div>
    </div>
  )
}
