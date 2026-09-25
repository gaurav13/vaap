import { type NextRequest, NextResponse } from "next/server"
import { getSession, isStaff } from "@/lib/session"
import {
  exportProposalResultsCsv,
  exportElectionResultsCsv,
  exportAuditLogCsv,
  exportXrplLedgerCsv,
} from "@/lib/governance-reports"

export const dynamic = "force-dynamic"

const EXPORTS: Record<string, { fn: () => Promise<string>; filename: string }> = {
  proposals: { fn: exportProposalResultsCsv, filename: "governance-proposal-results.csv" },
  elections: { fn: exportElectionResultsCsv, filename: "governance-election-results.csv" },
  audit: { fn: exportAuditLogCsv, filename: "governance-audit-log.csv" },
  xrpl: { fn: exportXrplLedgerCsv, filename: "governance-xrpl-ledger.csv" },
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isStaff(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { kind } = await params
  const entry = EXPORTS[kind]
  if (!entry) {
    return NextResponse.json({ error: "Unknown export" }, { status: 404 })
  }

  const csv = await entry.fn()
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${entry.filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
