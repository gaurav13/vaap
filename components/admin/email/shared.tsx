import { cn } from "@/lib/utils"
import type { AudienceSelection, CampaignContent } from "@/lib/newsletter/content"

export type ComposerMode = "newsletter" | "custom" | "template"

export type Draft = {
  id: number | null
  status: string
  /** Internal template name (template mode only). */
  name: string
  content: CampaignContent
  audience: AudienceSelection
  isMarketing: boolean
  scheduledAt: string | null
}

export type Msg = { tone: "ok" | "error"; text: string } | null

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null
  return (
    <p
      role={msg.tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg px-3 py-2 text-sm leading-relaxed",
        msg.tone === "error" ? "bg-destructive/10 text-destructive" : "bg-mint text-green",
      )}
    >
      {msg.text}
    </p>
  )
}

export const inputCls =
  "h-10 w-full rounded-lg border border-line bg-card px-3 text-sm text-heading outline-none focus-visible:border-green focus-visible:ring-2 focus-visible:ring-green/20 disabled:opacity-60"

export const labelCls = "text-sm font-semibold text-heading"

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted-2">{hint}</p>}
    </div>
  )
}

export function Btn({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-green text-primary-foreground hover:bg-green/90",
        variant === "secondary" && "border border-line bg-card text-heading hover:bg-surface",
        variant === "ghost" && "text-body hover:bg-surface hover:text-heading",
        variant === "danger" && "border border-destructive/30 bg-card text-destructive hover:bg-destructive/10",
        className,
      )}
      {...props}
    />
  )
}

export const isComposing = (e: React.KeyboardEvent) => e.nativeEvent.isComposing || e.keyCode === 229
