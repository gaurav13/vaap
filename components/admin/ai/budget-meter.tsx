import { microUsd, usd } from "@/lib/ai-assistant/format"
import { cn } from "@/lib/utils"

export function BudgetMeter({
  label,
  spentMicro,
  reservedMicro,
  limitUsd,
}: {
  label: string
  spentMicro: number
  reservedMicro: number
  limitUsd: number
}) {
  const limit = limitUsd * 1e6
  const pct = limit > 0 ? Math.min(100, (spentMicro / limit) * 100) : 100
  const reservedPct = limit > 0 ? Math.min(100 - pct, (reservedMicro / limit) * 100) : 0
  const tone = pct >= 90 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-green"
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-heading">{label}</span>
        <span className="tabular-nums text-muted-2">
          <span className="font-semibold text-heading">{microUsd(spentMicro)}</span> / {usd(limitUsd, 2)} · {Math.round(pct)}%
        </span>
      </div>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={`${label} budget used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className={cn("h-full", tone)} style={{ width: `${pct}%` }} />
        <div className="h-full bg-green-light" style={{ width: `${reservedPct}%` }} />
      </div>
    </div>
  )
}
