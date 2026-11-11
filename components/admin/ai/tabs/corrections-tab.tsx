import Link from "next/link"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { aiUsageLogs } from "@/lib/db/schema"
import { getCorrections } from "@/lib/ai-assistant/analytics"
import { CorrectionForm, CorrectionCard } from "@/components/admin/ai/corrections-client"
import { Empty, Section } from "@/components/admin/ai/ui"
import { cn } from "@/lib/utils"

const FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Awaiting approval" },
  { key: "approved", label: "Live" },
  { key: "draft", label: "Drafts" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
]

export async function CorrectionsTab({ status, isSuperAdmin, fromLog }: { status: string; isSuperAdmin: boolean; fromLog: number | null }) {
  const valid = FILTERS.some((f) => f.key === status) ? status : ""
  const [rows, prefill] = await Promise.all([
    getCorrections(valid || undefined),
    fromLog
      ? db
          .select({ id: aiUsageLogs.id, question: aiUsageLogs.question, answer: aiUsageLogs.answer, topic: aiUsageLogs.topic })
          .from(aiUsageLogs)
          .where(eq(aiUsageLogs.id, fromLog))
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ])

  return (
    <div className="flex flex-col gap-6">
      <Section
        title={prefill ? "Correct this answer" : "New correction"}
        description={
          isSuperAdmin
            ? "Approved corrections take priority over generated answers for matching questions."
            : "Your correction is sent to a Super Admin for approval before the assistant uses it."
        }
      >
        <CorrectionForm key={prefill?.id ?? "new"} prefill={prefill} isSuperAdmin={isSuperAdmin} />
      </Section>

      <Section title="Corrections" description="Every edit is versioned. Only approved corrections are used by the assistant.">
        <nav aria-label="Filter corrections" className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key || "all"}
              href={`/admin/ai?tab=corrections${f.key ? `&status=${f.key}` : ""}`}
              aria-current={valid === f.key ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                valid === f.key ? "border-green bg-green text-primary-foreground" : "border-border text-muted-2 hover:text-heading",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        {rows.length ? (
          <ul className="flex flex-col gap-3">
            {rows.map((c) => (
              <li key={c.id}>
                <CorrectionCard correction={c} isSuperAdmin={isSuperAdmin} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No corrections here yet.</Empty>
        )}
      </Section>
    </div>
  )
}
