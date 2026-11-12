import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { STATUS_LABELS } from "@/lib/leadership"
import { cn } from "@/lib/utils"

type Row = {
  id: number
  name: string
  kind: string
  status: string
  published: boolean
  hasDraft: unknown
  submittedAt: Date | null
  updatedAt: Date
}

const TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  in_review: "bg-sky-100 text-sky-900",
  approved: "bg-green/10 text-green",
  rejected: "bg-muted text-muted-2",
}

export function LeadershipQueue({ rows, title = "Applications & drafts" }: { rows: Row[]; title?: string }) {
  const open = rows.filter((r) => r.status === "pending" || r.status === "in_review" || r.hasDraft)

  return (
    <section aria-labelledby="leadership-queue" className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="leadership-queue" className="flex items-center gap-2 font-semibold text-heading">
          <Sparkles className="size-4 text-green" aria-hidden="true" />
          {title}
        </h2>
        <Link href="/leadership/apply" className="text-sm text-muted-2 hover:text-green">
          Public form
        </Link>
      </div>
      {open.length === 0 ? (
        <p className="text-sm text-muted-2">No applications or drafts awaiting review.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {open.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/leadership/${r.id}`} className="group flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-heading group-hover:text-green">{r.name}</span>
                  <span className="block text-xs text-muted-2">
                    {r.kind}
                    {r.submittedAt && ` · applied ${r.submittedAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}`}
                  </span>
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", TONE[r.status] ?? TONE.rejected)}>
                  {r.published && r.hasDraft ? "Draft changes" : (STATUS_LABELS[r.status] ?? r.status)}
                </span>
                <ArrowRight className="size-4 text-muted-2 group-hover:text-green" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
