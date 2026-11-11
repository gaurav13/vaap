import "server-only"

import { gateway } from "ai"
import { and, eq, gte, isNull, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { aiUsageLogs } from "@/lib/db/schema"

/** Replaces estimated costs with the actual charge reported by Vercel AI Gateway. */
export async function reconcileCosts(limit = 25) {
  const rows = await db
    .select({ id: aiUsageLogs.id, generationIds: aiUsageLogs.generationIds })
    .from(aiUsageLogs)
    .where(
      and(
        isNull(aiUsageLogs.reconciledAt),
        ne(aiUsageLogs.generationIds, ""),
        gte(aiUsageLogs.createdAt, sql`now() - interval '14 days'`),
      ),
    )
    .limit(limit)

  let updated = 0
  for (const row of rows) {
    const ids = row.generationIds.split(",").filter(Boolean)
    try {
      const infos = await Promise.all(ids.map((id) => gateway.getGenerationInfo({ id })))
      const actual = Math.ceil(infos.reduce((sum, g) => sum + (g.totalCost ?? 0), 0) * 1_000_000)
      await db
        .update(aiUsageLogs)
        .set({ actualCostMicroUsd: actual, reconciledAt: new Date() })
        .where(eq(aiUsageLogs.id, row.id))
      updated++
    } catch (err) {
      // Generation info can take a few seconds to become available; retried on the next run.
      console.error("[ai-reconcile] lookup failed:", err instanceof Error ? err.message : err)
    }
  }
  return { checked: rows.length, updated }
}
