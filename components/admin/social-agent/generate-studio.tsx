"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"

const postTab = (status: string | null) =>
  status === "published" ? "published" : status === "approved" || status === "scheduled" ? "scheduled" : "approvals"
import { cn } from "@/lib/utils"
import { CATEGORIES } from "@/lib/social-agent/config"
import { generatePost } from "@/app/actions/social-agent"
import { Notice, StatusBadge, useAgentAction } from "./ui"

type Record = { sourceId: string; title: string; url: string; approvedAt: string; postId: number | null; postStatus: string | null }

export function GenerateStudio({ category, records, hasTemplate }: { category: string; records: Record[]; hasTemplate: boolean }) {
  const { pending, message, run } = useAgentAction()
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Categories" className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/admin/social-agent?tab=generate&cat=${c.key}`}
            aria-current={c.key === category ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium",
              c.key === category ? "border-green bg-green text-primary-foreground" : "border-line text-body hover:border-green",
            )}
          >
            {c.label}
          </Link>
        ))}
      </nav>
      {!hasTemplate && (
        <p className="rounded-md border border-warning/30 bg-warning-bg px-3 py-2 text-sm text-warning">
          This category has no active template.{" "}
          <Link href="/admin/social-agent?tab=templates" className="font-semibold underline">Upload and activate one</Link> before generating posts.
        </p>
      )}
      <Notice message={message} />
      {records.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted-2">No approved records in this category yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-card">
          {records.map((r) => (
            <li key={r.sourceId} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-heading">{r.title}</p>
                <p className="text-xs text-muted-2">Approved {new Date(r.approvedAt).toLocaleDateString("en-GB")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {r.postStatus && <StatusBadge status={r.postStatus} />}
                {r.postId && (
                  <Link href={`/admin/social-agent?tab=${postTab(r.postStatus)}&post=${r.postId}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                    Open
                  </Link>
                )}
                {r.postStatus !== "published" && (
                  <Button
                    size="sm"
                    disabled={pending || !hasTemplate}
                    onClick={() =>
                      run(
                        () => generatePost({ category, sourceId: r.sourceId }),
                        (res) => ("issues" in res && (res.issues as string[]).length ? "Draft created with issues flagged for review." : "Draft created and waiting for approval."),
                      )
                    }
                  >
                    <Sparkles className="size-4" aria-hidden="true" /> {r.postId ? "Regenerate" : "Generate"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
