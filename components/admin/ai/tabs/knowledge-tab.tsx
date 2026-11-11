import Link from "next/link"
import { getKnowledgeAssessment, getPendingKnowledge } from "@/lib/ai-assistant/analytics"
import { dateTime, num } from "@/lib/ai-assistant/format"
import { richTextToPlain } from "@/lib/rich-text-plain"
import { Empty, Section, Table, Td, Th } from "@/components/admin/ai/ui"
import { KnowledgeReviewButtons } from "@/components/admin/ai/admin-controls"

export async function KnowledgeTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [assessment, pending] = await Promise.all([getKnowledgeAssessment(), getPendingKnowledge()])
  const corrByTopic = new Map(assessment.corrections.map((c) => [c.topic, c]))

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Awaiting approval"
        description={
          isSuperAdmin
            ? "New or refreshed knowledge is not used by the assistant until you approve it."
            : "New knowledge you add goes live once a Super Admin approves it."
        }
        action={
          <Link href="/admin/ai-knowledge" className="text-sm font-medium text-green hover:underline">
            Manage sources
          </Link>
        }
      >
        {pending.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {pending.map((k) => (
              <li key={k.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-heading">{k.title}</p>
                  <span className="text-xs text-muted-2">
                    {k.category} · {k.kind} · {num(k.charCount)} chars · {dateTime(k.createdAt)}
                  </span>
                </div>
                {k.sourceUrl ? <p className="truncate text-xs text-muted-2">{k.sourceUrl}</p> : null}
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-2">{richTextToPlain(k.preview)}</p>
                {isSuperAdmin ? <KnowledgeReviewButtons id={k.id} title={k.title} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nothing waiting for approval.</Empty>
        )}
      </Section>

      <Section title="Coverage by category" description="Live = approved and enabled. Stale = not updated in 180 days.">
        {assessment.categories.length ? (
          <Table caption="Knowledge by category">
            <thead>
              <tr>
                <Th>Category</Th>
                <Th className="text-right">Live</Th>
                <Th className="text-right">Pending</Th>
                <Th className="text-right">Stale</Th>
                <Th>Last updated</Th>
              </tr>
            </thead>
            <tbody>
              {assessment.categories.map((c) => (
                <tr key={c.category}>
                  <Td className="capitalize">{c.category}</Td>
                  <Td className="text-right tabular-nums">{num(c.live)}</Td>
                  <Td className="text-right tabular-nums">{num(c.pending)}</Td>
                  <Td className={`text-right tabular-nums ${c.stale ? "text-warning" : ""}`}>{num(c.stale)}</Td>
                  <Td className="text-muted-2">{c.freshest ? dateTime(c.freshest) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No knowledge sources yet. Add the first one from Manage sources.</Empty>
        )}
      </Section>

      <Section title="Where knowledge is thin" description="Last 90 days. Topics with many unanswered or unhelpful answers need more knowledge or corrections.">
        {assessment.topics.length ? (
          <Table caption="Knowledge gaps by topic">
            <thead>
              <tr>
                <Th>Topic</Th>
                <Th className="text-right">Questions</Th>
                <Th className="text-right">Unanswered</Th>
                <Th className="text-right">Not helpful</Th>
                <Th className="text-right">Corrections</Th>
                <Th className="text-right">Still failing</Th>
              </tr>
            </thead>
            <tbody>
              {assessment.topics.map((t) => {
                const c = corrByTopic.get(t.topic)
                const gap = t.asks ? (t.unanswered + t.negative) / t.asks : 0
                return (
                  <tr key={t.topic}>
                    <Td className="capitalize">{t.topic}</Td>
                    <Td className="text-right tabular-nums">{num(t.asks)}</Td>
                    <Td className={`text-right tabular-nums ${gap > 0.2 ? "font-semibold text-destructive" : ""}`}>{num(t.unanswered)}</Td>
                    <Td className="text-right tabular-nums">{num(t.negative)}</Td>
                    <Td className="text-right tabular-nums">{num(c?.corrections ?? 0)}</Td>
                    <Td className={`text-right tabular-nums ${c?.stillFailing ? "text-warning" : ""}`}>{num(c?.stillFailing ?? 0)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        ) : (
          <Empty>No questions in the last 90 days.</Empty>
        )}
      </Section>
    </div>
  )
}
