import Link from "next/link"
import { getOverview, getTopQuestions, type Range } from "@/lib/ai-assistant/analytics"
import { getSpend } from "@/lib/ai-assistant/budget"
import { getAiSettings } from "@/lib/ai-assistant/settings"
import { MODEL_CATALOG, type AssistantModelId } from "@/lib/ai-assistant/config"
import { compact, credits, microUsd, num, usd } from "@/lib/ai-assistant/format"
import { RangeFilter } from "@/components/admin/ai/ai-tabs-nav"
import { Empty, Kpi, KpiGrid, Section } from "@/components/admin/ai/ui"
import { BudgetMeter } from "@/components/admin/ai/budget-meter"

export async function OverviewTab({ range, isSuperAdmin }: { range: Range; isSuperAdmin: boolean }) {
  const [o, spend, settings, top] = await Promise.all([getOverview(range), getSpend(), getAiSettings(), getTopQuestions(range, 5)])
  const live = settings.enabled && !settings.emergencyShutdown
  const modelLabel = MODEL_CATALOG[settings.defaultModel as AssistantModelId]?.label ?? settings.defaultModel
  const monthLimit = settings.monthlyBudgetUsd * 1e6
  const remaining = Math.max(0, monthLimit - spend.monthMicroUsd - spend.reservedMicroUsd)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${live ? "bg-accent text-green" : "bg-destructive/10 text-destructive"}`}
          >
            <span aria-hidden className={`size-2 rounded-full ${live ? "bg-green" : "bg-destructive"}`} />
            {live ? "Paid AI is on" : settings.emergencyShutdown ? "Emergency shutdown" : "Paid AI is off"}
          </span>
          <span className="text-muted-2">
            Model: <span className="font-medium text-heading">{modelLabel}</span>
          </span>
        </div>
        <RangeFilter tab="overview" range={range} />
      </div>

      <KpiGrid>
        <Kpi label="Users" value={num(o.users)} hint={`${num(o.registered)} registered · ${num(o.guests)} guests`} />
        <Kpi label="Conversations" value={num(o.conversations)} />
        <Kpi label="Questions asked" value={num(o.questions)} hint={`${num(o.requests)} total requests`} />
        <Kpi
          label="Success rate"
          value={o.requests ? `${Math.round((o.ok / o.requests) * 100)}%` : "—"}
          hint={`${num(o.failed)} failed · ${num(o.blocked)} blocked or free`}
          tone={o.failed > 0 ? "warn" : "default"}
        />
        <Kpi label="Tokens" value={compact(o.inputTokens + o.outputTokens)} hint={`${compact(o.inputTokens)} in · ${compact(o.outputTokens)} out`} />
        <Kpi
          label="Spend"
          value={microUsd(o.spendMicroUsd)}
          hint={
            o.reconciled
              ? `${microUsd(o.actualMicroUsd)} reconciled from ${num(o.reconciled)} requests`
              : "All figures are estimates until reconciled"
          }
        />
        <Kpi label="VAAP credits used" value={credits(o.spendMicroUsd)} hint="Internal unit: 1 credit = $0.001 estimated" />
        <Kpi
          label="Satisfaction"
          value={o.satisfaction == null ? "—" : `${o.satisfaction}%`}
          hint={`${num(o.feedbackUp)} helpful · ${num(o.feedbackDown)} not helpful`}
          tone={o.satisfaction != null && o.satisfaction < 70 ? "bad" : "default"}
        />
      </KpiGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Budget" description="Spend this month and today against your limits. Reserved = requests still in flight.">
          <div className="flex flex-col gap-4">
            <BudgetMeter label="This month" spentMicro={spend.monthMicroUsd} reservedMicro={spend.reservedMicroUsd} limitUsd={settings.monthlyBudgetUsd} />
            <BudgetMeter label="Today" spentMicro={spend.dayMicroUsd} reservedMicro={spend.reservedMicroUsd} limitUsd={settings.dailyBudgetUsd} />
            <p className="text-sm text-muted-2">
              Remaining this month: <span className="font-semibold text-heading">{microUsd(remaining, 2)}</span> of{" "}
              {usd(settings.monthlyBudgetUsd, 2)}
              {isSuperAdmin ? (
                <>
                  {" · "}
                  <Link href="/admin/ai?tab=settings" className="font-medium text-green underline-offset-2 hover:underline">
                    Change limits
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </Section>

        <Section title="Needs attention" description="Items waiting on a person.">
          <ul className="flex flex-col divide-y divide-border text-sm">
            <AttentionRow href="/admin/ai?tab=improvement" label="Questions the assistant could not answer" count={o.unanswered} />
            <AttentionRow href="/admin/ai?tab=corrections&status=pending" label="Corrections awaiting approval" count={o.pendingCorrections} />
            <AttentionRow href="/admin/ai?tab=questions&status=error" label="Failed requests" count={o.failed} />
            <AttentionRow href="/admin/ai?tab=improvement" label="Answers rated not helpful" count={o.feedbackDown} />
            <li className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-muted-2">Approved corrections in use</span>
              <span className="font-semibold tabular-nums text-heading">{num(o.approvedCorrections)}</span>
            </li>
          </ul>
        </Section>
      </div>

      <Section
        title="Most asked"
        action={
          <Link href={`/admin/ai?tab=improvement&range=${range}`} className="text-sm font-medium text-green hover:underline">
            All insights
          </Link>
        }
      >
        {top.length ? (
          <ol className="flex flex-col divide-y divide-border">
            {top.map((q) => (
              <li key={q.question} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                <span className="text-pretty text-heading">{q.question}</span>
                <span className="shrink-0 tabular-nums text-muted-2">{q.asks}×</span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>No questions in this period yet.</Empty>
        )}
      </Section>
    </div>
  )
}

function AttentionRow({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between gap-3 py-2.5 hover:text-green">
        <span className="text-heading">{label}</span>
        <span
          className={`min-w-8 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${count ? "bg-warning-bg text-warning" : "bg-muted text-muted-2"}`}
        >
          {num(count)}
        </span>
      </Link>
    </li>
  )
}
