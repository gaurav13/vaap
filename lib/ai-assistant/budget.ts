import "server-only"

import { pool } from "@/lib/db"
import { notify } from "@/lib/notifications"
import type { AiSettings } from "./config"

const LOCK_KEY = "vaap_ai_budget"
const RESERVATION_TTL_SECONDS = 180
const PAID_SPEND = `coalesce("actualCostMicroUsd", "costMicroUsd")`

export type SpendSnapshot = {
  monthMicroUsd: number
  dayMicroUsd: number
  reservedMicroUsd: number
}

export async function getSpend(): Promise<SpendSnapshot> {
  const { rows } = await pool.query<{ month: string; day: string; reserved: string }>(`
    select
      coalesce(sum(${PAID_SPEND}) filter (where "createdAt" >= date_trunc('month', now())), 0) as month,
      coalesce(sum(${PAID_SPEND}) filter (where "createdAt" >= date_trunc('day', now())), 0) as day,
      (select coalesce(sum("amountMicroUsd"), 0) from ai_budget_reservations where "expiresAt" > now()) as reserved
    from ai_usage_logs
    where "createdAt" >= date_trunc('month', now())`)
  const r = rows[0]
  return { monthMicroUsd: Number(r?.month ?? 0), dayMicroUsd: Number(r?.day ?? 0), reservedMicroUsd: Number(r?.reserved ?? 0) }
}

export function budgetHasRoom(s: AiSettings, spend: SpendSnapshot) {
  const committed = spend.reservedMicroUsd
  return (
    spend.monthMicroUsd + committed < s.monthlyBudgetUsd * 1_000_000 &&
    spend.dayMicroUsd + committed < s.dailyBudgetUsd * 1_000_000
  )
}

export type ReserveResult = { ok: true } | { ok: false; reason: "monthly" | "daily" }

/**
 * Atomically checks remaining budget and holds the request's worst-case cost.
 * A transaction-scoped advisory lock serializes concurrent reservations, so two
 * requests can never both pass the check against the same remaining budget.
 */
export async function reserveBudget(requestId: string, worstCaseMicroUsd: number, s: AiSettings): Promise<ReserveResult> {
  const client = await pool.connect()
  try {
    await client.query("begin")
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY])
    await client.query(`delete from ai_budget_reservations where "expiresAt" <= now()`)
    const { rows } = await client.query<{ month: string; day: string; reserved: string }>(`
      select
        coalesce((select sum(${PAID_SPEND}) from ai_usage_logs where "createdAt" >= date_trunc('month', now())), 0) as month,
        coalesce((select sum(${PAID_SPEND}) from ai_usage_logs where "createdAt" >= date_trunc('day', now())), 0) as day,
        coalesce((select sum("amountMicroUsd") from ai_budget_reservations), 0) as reserved`)
    const month = Number(rows[0].month)
    const day = Number(rows[0].day)
    const reserved = Number(rows[0].reserved)

    if (month + reserved + worstCaseMicroUsd > s.monthlyBudgetUsd * 1_000_000) {
      await client.query("rollback")
      return { ok: false, reason: "monthly" }
    }
    if (day + reserved + worstCaseMicroUsd > s.dailyBudgetUsd * 1_000_000) {
      await client.query("rollback")
      return { ok: false, reason: "daily" }
    }
    await client.query(
      `insert into ai_budget_reservations ("requestId", "amountMicroUsd", "expiresAt")
       values ($1, $2, now() + ($3 || ' seconds')::interval) on conflict ("requestId") do nothing`,
      [requestId, worstCaseMicroUsd, String(RESERVATION_TTL_SECONDS)],
    )
    await client.query("commit")
    return { ok: true }
  } catch (err) {
    await client.query("rollback").catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function releaseBudget(requestId: string) {
  await pool.query(`delete from ai_budget_reservations where "requestId" = $1`, [requestId]).catch((err) => {
    console.error("[ai-budget] release failed:", err instanceof Error ? err.message : err)
  })
}

/** Sends each configured threshold alert once per month / day. */
export async function checkBudgetAlerts(s: AiSettings) {
  try {
    const spend = await getSpend()
    const now = new Date()
    const periods = [
      { period: `month:${now.toISOString().slice(0, 7)}`, spent: spend.monthMicroUsd, limit: s.monthlyBudgetUsd, label: "monthly" },
      { period: `day:${now.toISOString().slice(0, 10)}`, spent: spend.dayMicroUsd, limit: s.dailyBudgetUsd, label: "daily" },
    ]
    for (const p of periods) {
      if (p.limit <= 0) continue
      const pct = (p.spent / (p.limit * 1_000_000)) * 100
      // Only the monthly budget alerts at every threshold; the daily cap alerts when reached.
      const thresholds = p.label === "monthly" ? s.alertThresholds : [100]
      for (const t of thresholds.filter((t) => pct >= t)) {
        const { rowCount } = await pool.query(
          `insert into ai_budget_alerts (period, threshold, "spentMicroUsd") values ($1, $2, $3) on conflict do nothing`,
          [p.period, t, p.spent],
        )
        if (!rowCount) continue
        const spentUsd = (p.spent / 1_000_000).toFixed(2)
        const reached = t >= 100
        await notify({
          role: "admin",
          type: "info",
          title: reached ? `Ask VAAP AI ${p.label} budget reached` : `Ask VAAP AI has used ${t}% of its ${p.label} budget`,
          body: reached
            ? `$${spentUsd} of $${p.limit.toFixed(2)} used. Paid AI answers are paused; members now get free FAQ answers until the budget resets or is raised.`
            : `$${spentUsd} of $${p.limit.toFixed(2)} used this ${p.label === "monthly" ? "month" : "day"}.`,
          link: "/admin/ai-management",
        })
      }
    }
  } catch (err) {
    console.error("[ai-budget] alert check failed:", err instanceof Error ? err.message : err)
  }
}
