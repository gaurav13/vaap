import { getUserUsage, type Range } from "@/lib/ai-assistant/analytics"
import { compact, dateTime, num, shortId, usd } from "@/lib/ai-assistant/format"
import { RangeFilter } from "@/components/admin/ai/ai-tabs-nav"
import { Empty, Kpi, KpiGrid, Section, Table, Td, Th } from "@/components/admin/ai/ui"

export async function UsersTab({ range }: { range: Range }) {
  const users = await getUserUsage(range, 50)
  const registered = users.filter((u) => u.registered)
  const guests = users.filter((u) => !u.registered)
  const sum = (list: typeof users, k: "questions" | "spendUsd") => list.reduce((a, u) => a + u[k], 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <RangeFilter tab="users" range={range} />
      </div>

      <KpiGrid>
        <Kpi label="Members" value={num(registered.length)} hint={`${num(sum(registered, "questions"))} questions`} />
        <Kpi label="Guests" value={num(guests.length)} hint={`${num(sum(guests, "questions"))} questions`} />
        <Kpi label="Member spend" value={usd(sum(registered, "spendUsd"), 4)} />
        <Kpi label="Guest spend" value={usd(sum(guests, "spendUsd"), 4)} />
      </KpiGrid>

      <Section title="Top users" description="Top 50 by spend. Guests are grouped by anonymous session.">
        {users.length ? (
          <Table caption="AI usage by user">
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Type</Th>
                <Th className="text-right">Questions</Th>
                <Th className="text-right">Conversations</Th>
                <Th className="text-right">Tokens</Th>
                <Th className="text-right">Spend</Th>
                <Th>Last active</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.who}>
                  <Td>
                    {u.registered ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{u.name || "Unnamed member"}</span>
                        {u.email ? <span className="text-xs text-muted-2">{u.email}</span> : null}
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-muted-2">{shortId(u.who)}</span>
                    )}
                  </Td>
                  <Td className="text-muted-2">{u.registered ? "Member" : "Guest"}</Td>
                  <Td className="text-right tabular-nums">{num(u.questions)}</Td>
                  <Td className="text-right tabular-nums">{num(u.conversations)}</Td>
                  <Td className="text-right tabular-nums">{compact(u.tokens)}</Td>
                  <Td className="text-right tabular-nums">{usd(u.spendUsd, 4)}</Td>
                  <Td className="whitespace-nowrap text-muted-2">{dateTime(u.last)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No usage in this period.</Empty>
        )}
      </Section>
    </div>
  )
}
