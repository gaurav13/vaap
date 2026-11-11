import { getDailySeries, getModelBreakdown, getMonthlySeries, getOverview, getRequests, type Range } from "@/lib/ai-assistant/analytics"
import { MODEL_CATALOG, type AssistantModelId } from "@/lib/ai-assistant/config"
import { compact, credits, dateTime, microUsd, num, shortId, usd } from "@/lib/ai-assistant/format"
import { RangeFilter } from "@/components/admin/ai/ai-tabs-nav"
import { ModelCostChart, SpendChart, TokenChart } from "@/components/admin/ai/ai-charts"
import { Empty, EstimateTag, Kpi, KpiGrid, Pager, Section, StatusBadge, Table, Td, Th } from "@/components/admin/ai/ui"

const modelLabel = (m: string) => MODEL_CATALOG[m as AssistantModelId]?.label ?? m

export async function CostTab({ range, page, status }: { range: Range; page: number; status: string }) {
  const [o, daily, monthly, models, ledger] = await Promise.all([
    getOverview(range),
    getDailySeries(30),
    getMonthlySeries(12),
    getModelBreakdown(range),
    getRequests({ range, page, status: status || undefined, pageSize: 25 }),
  ])
  const avg = o.requests ? o.spendMicroUsd / o.requests : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <RangeFilter tab="cost" range={range} />
      </div>

      <KpiGrid>
        <Kpi label="Spend" value={microUsd(o.spendMicroUsd)} hint={o.reconciled ? `${num(o.reconciled)} reconciled` : "Estimated"} />
        <Kpi label="Credits used" value={credits(o.spendMicroUsd)} hint="1 credit = $0.001" />
        <Kpi label="Avg per request" value={microUsd(avg, 5)} />
        <Kpi label="Tokens" value={compact(o.inputTokens + o.outputTokens)} hint={`${compact(o.inputTokens)} in · ${compact(o.outputTokens)} out`} />
      </KpiGrid>

      <Section title="Daily spend" description="Last 30 days. Actual = reconciled from the AI Gateway.">
        <SpendChart data={daily} xKey="day" />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Monthly spend" description="Last 12 months.">
          <SpendChart data={monthly} xKey="month" />
        </Section>
        <Section title="Tokens per day">
          <TokenChart data={daily} />
        </Section>
      </div>

      <Section title="By model">
        {models.length ? (
          <div className="flex flex-col gap-4">
            <ModelCostChart data={models.map((m) => ({ label: modelLabel(m.model), estimatedUsd: m.estimatedUsd }))} />
            <Table caption="Cost by model">
              <thead>
                <tr>
                  <Th>Model</Th>
                  <Th>Provider</Th>
                  <Th className="text-right">Requests</Th>
                  <Th className="text-right">Input</Th>
                  <Th className="text-right">Cached</Th>
                  <Th className="text-right">Output</Th>
                  <Th className="text-right">Estimated</Th>
                  <Th className="text-right">Actual</Th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={`${m.provider}-${m.model}`}>
                    <Td>{modelLabel(m.model)}</Td>
                    <Td className="text-muted-2">{m.provider}</Td>
                    <Td className="text-right tabular-nums">{num(m.requests)}</Td>
                    <Td className="text-right tabular-nums">{compact(m.input)}</Td>
                    <Td className="text-right tabular-nums">{compact(m.cached)}</Td>
                    <Td className="text-right tabular-nums">{compact(m.output)}</Td>
                    <Td className="text-right tabular-nums">{usd(m.estimatedUsd, 4)}</Td>
                    <Td className="text-right tabular-nums">{m.actualUsd ? usd(m.actualUsd, 4) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <Empty>No paid requests in this period.</Empty>
        )}
      </Section>

      <Section title="Request ledger" description="Every logged request with its tokens and cost.">
        {ledger.rows.length ? (
          <>
            <Table caption="Request ledger">
              <thead>
                <tr>
                  <Th>Time</Th>
                  <Th>Request</Th>
                  <Th>User</Th>
                  <Th>Model</Th>
                  <Th className="text-right">In / Out</Th>
                  <Th className="text-right">Cost</Th>
                  <Th className="text-right">Latency</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {ledger.rows.map((r) => (
                  <tr key={r.id}>
                    <Td className="whitespace-nowrap text-muted-2">{dateTime(r.createdAt)}</Td>
                    <Td className="font-mono text-xs">{shortId(r.requestId)}</Td>
                    <Td className="font-mono text-xs">{r.userId ? shortId(r.userId) : "guest"}</Td>
                    <Td className="whitespace-nowrap">{r.model ? modelLabel(r.model) : "—"}</Td>
                    <Td className="text-right tabular-nums">
                      {num(r.inputTokens)} / {num(r.outputTokens)}
                    </Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">
                      {microUsd(r.actualMicroUsd ?? r.estimatedMicroUsd, 5)}
                      <EstimateTag actual={r.actualMicroUsd != null} />
                    </Td>
                    <Td className="text-right tabular-nums text-muted-2">{r.latencyMs ? `${(r.latencyMs / 1000).toFixed(1)}s` : "—"}</Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pager
              page={ledger.page}
              total={ledger.total}
              pageSize={ledger.pageSize}
              href={(p) => `/admin/ai?tab=cost&range=${range}${status ? `&status=${status}` : ""}&page=${p}`}
            />
          </>
        ) : (
          <Empty>No requests in this period.</Empty>
        )}
      </Section>
    </div>
  )
}
