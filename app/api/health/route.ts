import { pool } from "@/lib/db"

export const dynamic = "force-dynamic"

// Uptime monitors poll this endpoint. It returns 503 when the database is
// unreachable, so a monitor alerts on real outages instead of only on page 500s.
export async function GET() {
  const started = Date.now()
  try {
    await pool.query("select 1")
    return Response.json(
      { status: "ok", database: "ok", latencyMs: Date.now() - started, pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount } },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[health] database check failed:", (error as Error).message)
    return Response.json(
      { status: "degraded", database: "unreachable", latencyMs: Date.now() - started },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
}
