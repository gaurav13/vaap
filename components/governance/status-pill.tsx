import { cn } from "@/lib/utils"

const STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-2",
  published: "bg-blue-50 text-blue-700",
  active: "bg-green/15 text-green",
  closed: "bg-navy/10 text-navy",
  archived: "bg-muted text-muted-2",
  results_published: "bg-green/15 text-green",
  passed: "bg-green/15 text-green",
  failed: "bg-destructive/10 text-destructive",
  no_quorum: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-green/15 text-green",
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        STYLES[status] ?? "bg-muted text-muted-2",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  )
}
