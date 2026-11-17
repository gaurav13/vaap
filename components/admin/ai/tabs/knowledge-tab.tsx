import Link from "next/link"
import { getKnowledgeAssessment, getPendingKnowledge, getSiteSyncOverview } from "@/lib/ai-assistant/analytics"
import { getLastSyncReport } from "@/lib/ai-assistant/site-sync"
import { SyncNowButton, SyncedChangeButtons } from "@/components/admin/ai/site-sync-controls"
import { dateTime, num } from "@/lib/ai-assistant/format"
import { richTextToPlain } from "@/lib/rich-text-plain"
import { Empty, Section, Table, Td, Th } from "@/components/admin/ai/ui"
import { KnowledgeReviewButtons } from "@/components/admin/ai/admin-controls"

const COVERAGE_GAPS = [
  "Lawyers Network (only a pending planned-service entry)",
  "University Awareness Drive",
  "Startup and Hackathon programme",
  "Contracts and partnerships",
]

export async function KnowledgeTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [assessment, pending, sync, lastRun] = await Promise.all([
    getKnowledgeAssessment(),
    getPendingKnowledge(),
    getSiteSyncOverview(),
    getLastSyncReport(),
  ])
  const corrByTopic = new Map(assessment.corrections.map((c) => [c.topic, c]))

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Website sync"
        description="Published leadership, KOLs, membership, pages, news, articles, events and how-to guides are synced daily and whenever they are saved."
        action={<SyncNowButton />}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-2">
            {lastRun
              ? `Last run ${dateTime(lastRun.finishedAt)}: ${lastRun.created} added, ${lastRun.updated} updated, ${lastRun.unchanged} unchanged, ${lastRun.removed} removed, ${lastRun.pendingReview} awaiting review, ${lastRun.failed.length} failed.`
              : "The website has not been synced yet."}
          </p>

          {sync.categories.length ? (
            <Table caption="Synced sources by category">
              <thead>
                <tr>
                  <Th>Category</Th>
                  <Th className="text-right">Sources</Th>
                  <Th>Last synced</Th>
                </tr>
              </thead>
              <tbody>
                {sync.categories.map((c) => (
                  <tr key={c.category}>
                    <Td className="capitalize">{c.category}</Td>
                    <Td className="text-right tabular-nums">{num(c.total)}</Td>
                    <Td className="text-muted-2">{c.lastSynced ? dateTime(c.lastSynced) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}

          {sync.failures.length ? (
            <div className="flex flex-col gap-1 rounded-md border border-destructive/30 p-3">
              <p className="text-sm font-semibold text-destructive">Sources that failed to sync</p>
              <ul className="flex flex-col gap-1 text-sm text-muted-2">
                {sync.failures.map((f) => (
                  <li key={f.id}>
                    {f.title}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {sync.changes.length ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-heading">Sensitive page changes waiting for review</p>
              <ul className="flex flex-col divide-y divide-border">
                {sync.changes.map((c) => (
                  <li key={c.id} className="flex flex-col gap-2 py-3">
                    <p className="font-semibold text-heading">{c.title}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-2">Live now</span>
                        <p className="line-clamp-6 text-sm leading-relaxed text-muted-2">{c.current}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-green">Proposed</span>
                        <p className="line-clamp-6 text-sm leading-relaxed text-heading">{c.proposed}</p>
                      </div>
                    </div>
                    {isSuperAdmin ? <SyncedChangeButtons id={c.id} title={c.title} /> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-heading">Coverage gaps</p>
            <p className="text-sm text-muted-2">
              No published content exists yet for these topics. Until it is added, the assistant says so and points people to Contact or Support.
            </p>
            <ul className="flex flex-col gap-1 text-sm text-muted-2">
              {COVERAGE_GAPS.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

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
