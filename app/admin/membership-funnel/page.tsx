import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getMembershipFunnel } from "@/lib/membership-funnel"
import { getAutomationState } from "@/lib/email-automations/engine"
import { MembershipFunnelDashboard } from "@/components/admin/membership-funnel-dashboard"

export const dynamic = "force-dynamic"

export const metadata = { title: "Registered Users & Paid Members" }

const iso = (d: Date | null) => (d ? d.toISOString() : null)

export default async function MembershipFunnelPage() {
  const session = await getSession()
  if (session?.user.role !== "admin") redirect("/admin")

  const [data, automation] = await Promise.all([getMembershipFunnel(), getAutomationState("membership-invitation")])

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Registered Users &amp; Paid Members</h1>
      <p className="mt-1 text-pretty text-muted-2">
        Website accounts are not memberships. A person moves to Paid Members only after their payment is verified and
        their membership is activated.
      </p>
      <MembershipFunnelDashboard
        stats={data.stats}
        funnel={data.funnel}
        automation={{
          enabled: automation.enabled,
          reminderDays: automation.config.reminderDays ?? [3, 7, 14],
          dailyLimit: automation.config.dailyLimit ?? 100,
          lastRunAt: iso(automation.lastRunAt),
        }}
        registered={data.registered.map((u) => ({
          ...u,
          registeredAt: u.registeredAt.toISOString(),
          lastInvitedAt: iso(u.lastInvitedAt),
        }))}
        paid={data.paid.map((p) => ({
          ...p,
          paymentDate: iso(p.paymentDate),
          activatedAt: p.activatedAt.toISOString(),
          expiresAt: iso(p.expiresAt),
        }))}
        history={data.history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() }))}
      />
    </div>
  )
}
