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

  const units = [
    { value: now?.d, label: "Days" },
    { value: now?.h, label: "Hrs" },
    { value: now?.m, label: "Min" },
  ]

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
          <Clock className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-2">
            {now?.done ? "Voting closed" : "Closes in"}
          </p>
          <p className="truncate text-sm text-heading">{label} PKT</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5" aria-live="polite">
        {units.map((u) => (
          <div key={u.label} className="flex w-11 flex-col items-center rounded-lg border border-line bg-card py-1">
            <span className="text-base font-bold leading-tight tabular-nums text-heading">
              {u.value === undefined ? "--" : pad(u.value)}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-2">{u.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
