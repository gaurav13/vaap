import Link from "next/link"
import type React from "react"
import { getRequests, type Range } from "@/lib/ai-assistant/analytics"
import { dateTime, microUsd, num, shortId } from "@/lib/ai-assistant/format"
import { RangeFilter } from "@/components/admin/ai/ai-tabs-nav"
import { Empty, EstimateTag, Pager, Section, StatusBadge } from "@/components/admin/ai/ui"

const STATUSES = ["", "ok", "error", "free_fallback", "blocked_budget", "blocked_quota", "disabled"]

export async function QuestionsTab({
  range,
  page,
  q,
  status,
  isSuperAdmin,
}: {
  range: Range
  page: number
  q: string
  status: string
  isSuperAdmin: boolean
}) {
  const data = await getRequests({ range, page, q: q.slice(0, 200), status: STATUSES.includes(status) ? status : "" })
  const qs = (p: number) =>
    `/admin/ai?tab=questions&range=${range}&page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}${status ? `&status=${status}` : ""}`

  return (
    <Section
      title="Questions & Answers"
      description="Every question with the answer the assistant gave. Open a row to see details or correct the answer."
      action={<RangeFilter tab="questions" range={range} extra={status ? `&status=${status}` : ""} />}
    >
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/ai">
        <input type="hidden" name="tab" value="questions" />
        <input type="hidden" name="range" value={range} />
        <label className="sr-only" htmlFor="qa-search">
          Search questions and answers
        </label>
        <input
          id="qa-search"
          name="q"
          defaultValue={q}
          placeholder="Search questions and answers"
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm text-heading"
        />
        <label className="sr-only" htmlFor="qa-status">
          Status
        </label>
        <select id="qa-status" name="status" defaultValue={status} className="h-9 rounded-md border border-border bg-background px-2 text-sm text-heading">
          <option value="">All statuses</option>
          <option value="ok">Answered</option>
          <option value="error">Failed</option>
          <option value="free_fallback">Free answer</option>
          <option value="blocked_budget">Blocked: budget</option>
          <option value="blocked_quota">Blocked: quota</option>
          <option value="disabled">AI off</option>
        </select>
        <button type="submit" className="h-9 rounded-md bg-green px-4 text-sm font-medium text-primary-foreground hover:bg-green-hover">
          Filter
        </button>
      </form>

      {data.rows.length ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {data.rows.map((r) => (
            <li key={r.id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-col gap-1.5 py-3 marker:hidden sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-pretty font-medium text-heading">{r.question || <em className="text-muted-2">No question text</em>}</span>
                    <span className="text-xs text-muted-2">
                      {dateTime(r.createdAt)} · {r.topic} · {r.language}
                      {r.rating != null ? ` · ${r.rating > 0 ? "Rated helpful" : "Rated not helpful"}` : ""}
                      {r.corrected ? " · Corrected" : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.answered === false ? <StatusBadge status="pending" label="Unanswered" /> : null}
                    <StatusBadge status={r.status} />
                  </div>
                </summary>
                <div className="flex flex-col gap-4 pb-4">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-2">Answer</p>
                    <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed text-heading">
                      {r.answer || r.errorMessage || "No answer was recorded for this request."}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                    <Meta k="User" v={isSuperAdmin ? (r.userId ? shortId(r.userId) : "Guest") : r.userId ? "Member" : "Guest"} />
                    <Meta k="Conversation" v={shortId(r.conversationId)} />
                    <Meta k="Model" v={r.model || "—"} />
                    <Meta k="Latency" v={r.latencyMs ? `${num(r.latencyMs)} ms` : "—"} />
                    <Meta k="Tokens" v={`${num(r.inputTokens)} in · ${num(r.outputTokens)} out`} />
                    <Meta
                      k="Cost"
                      v={
                        <>
                          {microUsd(r.actualMicroUsd ?? r.estimatedMicroUsd)}
                          <EstimateTag actual={r.actualMicroUsd != null} />
                        </>
                      }
                    />
                    <Meta k="Request" v={shortId(r.requestId)} />
                  </dl>
                  {r.question ? (
                    <Link
                      href={`/admin/ai?tab=corrections&log=${r.id}`}
                      className="self-start rounded-md border border-green-border px-3 py-1.5 text-sm font-medium text-green hover:bg-accent"
                    >
                      Correct this answer
                    </Link>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No matching questions.</Empty>
      )}
      <Pager page={data.page} total={data.total} pageSize={data.pageSize} href={qs} />
    </Section>
  )
}

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-2">{k}</dt>
      <dd className="font-medium text-heading">{v}</dd>
    </div>
  )
}
