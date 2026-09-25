import Link from "next/link"
import { CheckCircle2, XCircle, ExternalLink, ArrowLeft } from "lucide-react"
import { verifyReceipt } from "@/lib/governance"
import { explorerUrl } from "@/lib/xrpl"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { StatusPill } from "@/components/governance/status-pill"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Verify a Vote Receipt | VAAP Governance",
  description: "Confirm that a VAAP vote receipt is genuine and recorded in the governance register.",
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams
  const record = code ? await verifyReceipt(code) : null

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-14 sm:px-6">
        <Link
          href="/governance/register"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-2 hover:text-heading"
        >
          <ArrowLeft className="size-4" /> Public register
        </Link>
        <h1 className="text-3xl font-bold text-heading">Verify a vote receipt</h1>
        <p className="mt-1 text-muted-2">
          Enter the receipt code shown when a vote was cast to confirm it is genuine and recorded.
        </p>

        <form method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            name="code"
            defaultValue={code ?? ""}
            placeholder="e.g. VAAP-VOTE-XXXXXX"
            className="w-full rounded-lg border border-line bg-background px-3.5 py-2.5 font-mono text-sm text-heading outline-none transition-colors focus:border-green"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
          >
            Verify
          </button>
        </form>

        {code && (
          <div className="mt-8">
            {!record ? (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
                <XCircle className="mt-0.5 size-6 shrink-0 text-destructive" />
                <div>
                  <p className="font-bold text-heading">No matching receipt</p>
                  <p className="mt-1 text-sm text-muted-2">
                    We could not find a vote with that receipt code. Check the code and try again.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-green-border bg-mint p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-green" />
                  <div>
                    <p className="font-bold text-heading">Receipt verified</p>
                    <p className="mt-1 text-sm text-muted-2">
                      This receipt is genuine and recorded in the VAAP governance register.
                    </p>
                  </div>
                </div>
                <dl className="mt-5 grid gap-3 border-t border-green-border pt-5 text-sm">
                  <Row label="Receipt code" value={<span className="font-mono">{record.vote.receiptCode}</span>} />
                  {record.proposal && (
                    <Row
                      label="Resolution"
                      value={
                        <span>
                          {record.proposal.title}{" "}
                          <span className="font-mono text-xs text-muted-2">({record.proposal.reference})</span>
                        </span>
                      }
                    />
                  )}
                  <Row
                    label="Cast on"
                    value={record.vote.castAt ? new Date(record.vote.castAt).toLocaleString() : "—"}
                  />
                  <Row label="Ballot state" value={record.vote.isActive ? "Counted" : "Superseded"} />
                  <Row label="XRPL anchor" value={<StatusPill status={record.vote.xrplStatus ?? "pending"} />} />
                </dl>
                {record.vote.xrplTxHash && (
                  <a
                    href={explorerUrl(record.vote.xrplTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:underline"
                  >
                    View on the XRP Ledger <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <dt className="text-muted-2">{label}</dt>
      <dd className="font-medium text-heading">{value}</dd>
    </div>
  )
}
