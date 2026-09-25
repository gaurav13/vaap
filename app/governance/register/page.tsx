import Link from "next/link"
import { ExternalLink, ShieldCheck, Search } from "lucide-react"
import { listProposals, getProposalResult, getProposalAnchor } from "@/lib/governance"
import { explorerUrl, XRPL_NETWORK } from "@/lib/xrpl"
import { StatusPill } from "@/components/governance/status-pill"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Public Voting Register | VAAP Governance",
  description:
    "The public record of VAAP resolutions, member votes, and results anchored to the XRP Ledger for independent verification.",
}

export default async function PublicRegisterPage() {
  const proposals = await listProposals({ statuses: ["active", "closed", "results_published", "archived"] })
  const results = new Map<number, Awaited<ReturnType<typeof getProposalResult>>>()
  const anchorHashes = new Map<number, string | null>()
  await Promise.all(
    proposals.map(async (p) => {
      const [result, anchor] = await Promise.all([getProposalResult(p.id), getProposalAnchor(p.id)])
      results.set(p.id, result)
      anchorHashes.set(p.id, anchor?.txHash ?? null)
    }),
  )

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
        <div className="flex flex-col items-start gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-green">
            <ShieldCheck className="size-3.5" /> XRP Ledger · {XRPL_NETWORK}
          </span>
          <h1 className="text-3xl font-bold text-heading text-balance sm:text-4xl">Public voting register</h1>
          <p className="max-w-2xl text-pretty text-muted-2">
            Every VAAP resolution and its outcome is recorded here. Results are anchored to the XRP Ledger so anyone can
            independently verify that they have not been altered.
          </p>
          <Link
            href="/governance/verify"
            className="mt-1 inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-background"
          >
            <Search className="size-4" /> Verify a vote receipt
          </Link>
        </div>

        <div className="mt-10 flex flex-col gap-4">
          {proposals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-card py-16 text-center text-sm text-muted-2">
              No resolutions have been published yet.
            </div>
          ) : (
            proposals.map((p) => {
              const result = results.get(p.id)
              const anchorHash = anchorHashes.get(p.id) ?? null
              return (
                <article key={p.id} className="rounded-2xl border border-line bg-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-muted-2">{p.reference}</p>
                      <h2 className="text-lg font-bold text-heading text-balance">{p.title}</h2>
                    </div>
                    <StatusPill status={result?.outcome ?? p.status} />
                  </div>
                  {p.summary && <p className="mt-2 text-sm text-muted-2">{p.summary}</p>}

                  {result && (
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-4 text-sm">
                      {p.voteType === "yes_no_abstain" ? (
                        <>
                          <Metric label="Yes" value={result.yesCount} />
                          <Metric label="No" value={result.noCount} />
                          <Metric label="Abstain" value={result.abstainCount} />
                        </>
                      ) : (
                        <Metric label="Total votes" value={result.totalVotes} />
                      )}
                      {anchorHash && (
                        <a
                          href={explorerUrl(anchorHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto inline-flex items-center gap-1.5 font-semibold text-green hover:underline"
                        >
                          Verify on XRPL <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </article>
              )
            })
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-base font-bold text-heading">{value}</span>
      <span className="text-xs text-muted-2">{label}</span>
    </span>
  )
}
