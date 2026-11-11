import { getAiAuditLog, getBudgetAlerts } from "@/lib/ai-assistant/analytics"
import { dateTime, shortId, usd } from "@/lib/ai-assistant/format"
import { Empty, Section, Table, Td, Th } from "@/components/admin/ai/ui"

export async function AuditTab() {
  const [log, alerts] = await Promise.all([getAiAuditLog(100), getBudgetAlerts()])

  return (
    <div className="flex flex-col gap-6">
      <Section title="Budget alerts sent" description="Emails sent to Super Admins when spend crossed a threshold.">
        {alerts.length ? (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {alerts.map((a) => (
              <li key={`${a.period}-${a.threshold}`} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span className="text-heading">
                  {a.threshold}% of <span className="capitalize">{a.period.split(":")[0]}</span> budget · {usd(a.spentUsd, 2)} spent
                </span>
                <span className="text-muted-2">{dateTime(a.sentAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No alerts sent yet.</Empty>
        )}
      </Section>

      <Section title="Activity" description="Admin changes to AI settings, knowledge and corrections, plus blocked or failed requests.">
        {log.length ? (
          <Table caption="AI audit log">
            <thead>
              <tr>
                <Th>Time</Th>
                <Th>Who</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {log.map((e) => (
                <tr key={`${e.kind}-${e.id}`}>
                  <Td className="whitespace-nowrap text-muted-2">{dateTime(e.createdAt)}</Td>
                  <Td>
                    {e.kind === "admin" ? (
                      <span className="flex flex-col">
                        <span className="font-medium">{e.actor || "—"}</span>
                        {e.role ? <span className="text-xs capitalize text-muted-2">{e.role}</span> : null}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-muted-2">{e.actor === "guest" ? "guest" : shortId(e.actor)}</span>
                    )}
                  </Td>
                  <Td className="font-mono text-xs">{e.action}</Td>
                  <Td className="text-muted-2">{e.target || "—"}</Td>
                  <Td className="max-w-xs truncate text-xs text-muted-2" >
                    <span title={e.details ?? ""}>{e.details || "—"}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No AI activity recorded yet.</Empty>
        )}
      </Section>
    </div>
  )
}
