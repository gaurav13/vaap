import Link from "next/link"
import { getFeedback, getTopQuestions, getTopics, getTrendingKeywords, getUnanswered, type Range } from "@/lib/ai-assistant/analytics"
import { dateTime, num } from "@/lib/ai-assistant/format"
import { RangeFilter } from "@/components/admin/ai/ai-tabs-nav"
import { Empty, Section } from "@/components/admin/ai/ui"

export async function ImprovementTab({ range }: { range: Range }) {
  const [top, topics, unanswered, feedback, keywords] = await Promise.all([
    getTopQuestions(range, 15),
    getTopics(range),
    getUnanswered(30),
    getFeedback(30),
    getTrendingKeywords(20),
  ])
  const maxTopic = Math.max(1, ...topics.map((t) => t.asks))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <RangeFilter tab="improvement" range={range} />
      </div>

      <Section title="Could not answer" description="Questions the assistant could not answer well. Write a correction so it answers next time.">
        {unanswered.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {unanswered.map((u) => (
              <li key={u.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-pretty font-medium text-heading">{u.question}</p>
                  <p className="text-xs text-muted-2">
                    <span className="capitalize">{u.topic}</span> · {dateTime(u.createdAt)}
                  </p>
                </div>
                <Link
                  href={`/admin/ai?tab=corrections&log=${u.id}`}
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 font-medium text-heading hover:bg-muted"
                >
                  Write correction
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Every recent question was answered or already has a correction.</Empty>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Most asked">
          {top.length ? (
            <ol className="flex flex-col divide-y divide-border">
              {top.map((q) => (
                <li key={q.question} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                  <span className="text-pretty text-heading">{q.question}</span>
                  <span className="shrink-0 tabular-nums text-muted-2">
                    {q.asks}×{q.unanswered ? <span className="text-destructive"> · {q.unanswered} missed</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>No questions in this period.</Empty>
          )}
        </Section>

        <Section title="Topics">
          {topics.length ? (
            <ul className="flex flex-col gap-3">
              {topics.map((t) => (
                <li key={t.topic} className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="capitalize text-heading">{t.topic}</span>
                    <span className="tabular-nums text-muted-2">
                      {num(t.asks)}
                      {t.unanswered ? ` · ${num(t.unanswered)} missed` : ""}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-green" style={{ width: `${(t.asks / maxTopic) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No topics yet.</Empty>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Feedback" description="Unhelpful ratings first.">
          {feedback.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {feedback.map((f) => (
                <li key={f.id} className="flex flex-col gap-1 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-pretty font-medium text-heading">{f.question || "—"}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${f.rating < 0 ? "bg-destructive/10 text-destructive" : "bg-accent text-green"}`}
                    >
                      {f.rating < 0 ? "Not helpful" : "Helpful"}
                    </span>
                  </div>
                  {f.comment ? <p className="leading-relaxed text-muted-2">{`"${f.comment}"`}</p> : null}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-2">
                    <span>{dateTime(f.createdAt)}</span>
                    {f.rating < 0 && f.usageLogId ? (
                      <Link href={`/admin/ai?tab=corrections&log=${f.usageLogId}`} className="font-medium text-green hover:underline">
                        Write correction
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No feedback yet.</Empty>
          )}
        </Section>

        <Section title="Trending keywords" description="Words most used in questions over the last 7 days (out of 30).">
          {keywords.length ? (
            <ul className="flex flex-wrap gap-2">
              {keywords.map((k) => (
                <li key={k.word} className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-heading">
                  {k.word} <span className="tabular-nums text-muted-2">{k.recent}/{k.total}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Not enough questions yet.</Empty>
          )}
        </Section>
      </div>
    </div>
  )
}
