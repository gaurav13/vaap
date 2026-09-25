import Link from "next/link"
import { ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { xrplTransactionQueue } from "@/lib/db/schema"
import { getXrplStatus, accountExplorerUrl, networkLabel } from "@/lib/xrpl"

async function getQueueCounts() {
  const rows = await db
    .select({ status: xrplTransactionQueue.status, count: sql<number>`count(*)::int` })
    .from(xrplTransactionQueue)
    .groupBy(xrplTransactionQueue.status)
  const map = Object.fromEntries(rows.map((r) => [r.status, r.count]))
  return {
    pending: (map.pending ?? 0) + (map.processing ?? 0),
    failed: map.failed ?? 0,
    verified: map.verified ?? 0,
  }
}

export async function XrplStatusPanel() {
  const [status, queue] = await Promise.all([getXrplStatus(), getQueueCounts().catch(() => null)])
  const tone = status.ready ? "border-green/30 bg-mint" : "border-amber-300 bg-amber-50"

  return (
    <section aria-label="XRP Ledger status" className={`mb-6 rounded-2xl border p-5 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-green">
            {status.ready ? <ShieldCheck className="size-5" /> : <TriangleAlert className="size-5 text-amber-700" />}
          </span>
          <div>
            <h2 className="text-sm font-bold text-heading">
              XRP Ledger · {networkLabel(status.network)} {status.ready ? "· Ready" : "· Action needed"}
            </h2>
            <p className="mt-0.5 text-sm text-muted-2">{status.message}</p>
            <Link href="/admin/governance/xrpl-setup" className="mt-1 inline-block text-sm font-semibold text-green hover:underline">
              {status.ready ? "XRPL setup guide" : "Set up XRPL account →"}
            </Link>
            {status.address && (
              <a
                href={accountExplorerUrl(status.address, status.network)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-green hover:underline"
              >
                {status.address} <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
        <dl className="flex flex-wrap gap-5 text-sm">
          {status.balanceXrp !== null && (
            <div>
              <dt className="text-xs text-muted-2">Balance</dt>
              <dd className="font-semibold text-heading">{status.balanceXrp.toFixed(4)} XRP</dd>
            </div>
          )}
          {status.reserveXrp !== null && (
            <div>
              <dt className="text-xs text-muted-2">Reserve</dt>
              <dd className="font-semibold text-heading">{status.reserveXrp} XRP</dd>
            </div>
          )}
          {queue && (
            <>
              <div>
                <dt className="text-xs text-muted-2">Queued</dt>
                <dd className="font-semibold text-heading">{queue.pending}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-2">Failed</dt>
                <dd className={`font-semibold ${queue.failed ? "text-destructive" : "text-heading"}`}>{queue.failed}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-2">Anchored</dt>
                <dd className="font-semibold text-heading">{queue.verified}</dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </section>
  )
}
