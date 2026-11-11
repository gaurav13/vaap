export const usd = (value: number, digits?: number) => {
  const d = digits ?? (value !== 0 && Math.abs(value) < 1 ? 4 : 2)
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`
}

export const microUsd = (micro: number, digits?: number) => usd(micro / 1e6, digits)

export const num = (value: number) => value.toLocaleString("en-US")

export const compact = (value: number) =>
  value.toLocaleString("en-US", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 })

export const credits = (micro: number) => (micro / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" })

export const shortId = (id: string | null | undefined) => (id ? (id.length > 10 ? `${id.slice(0, 8)}…` : id) : "—")

export const STATUS_LABELS: Record<string, string> = {
  ok: "Answered",
  error: "Failed",
  blocked_budget: "Blocked: budget",
  blocked_quota: "Blocked: quota",
  disabled: "AI off",
  free_fallback: "Free answer",
}
