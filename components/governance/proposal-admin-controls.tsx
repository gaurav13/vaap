"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { setProposalStatusAction, recomputeResultAction } from "@/app/actions/governance"

export function ProposalAdminControls({ id, status }: { id: number; status: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState("")

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setMessage("")
    startTransition(async () => {
      const res = await fn()
      setMessage(res.ok ? ok : (res.error ?? "Something went wrong."))
      router.refresh()
    })
  }

  async function processQueue() {
    setMessage("")
    startTransition(async () => {
      try {
        const res = await fetch("/api/governance/xrpl-worker", { method: "POST" })
        const json = await res.json()
        setMessage(json.ok ? `Processed ${json.processed?.length ?? 0} XRPL job(s).` : "Worker failed.")
      } catch {
        setMessage("Could not reach the XRPL worker.")
      }
      router.refresh()
    })
  }

  const btn =
    "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap gap-2.5">
        {status === "draft" && (
          <button className={`${btn} bg-navy text-white hover:bg-navy/90`} disabled={pending} onClick={() => run(() => setProposalStatusAction(id, "published"), "Published.")}>
            Publish
          </button>
        )}
        {(status === "draft" || status === "published") && (
          <button className={`${btn} bg-green text-white hover:bg-green-hover`} disabled={pending} onClick={() => run(() => setProposalStatusAction(id, "active"), "Voting is now open.")}>
            Open voting
          </button>
        )}
        {status === "active" && (
          <>
            <button className={`${btn} bg-green text-white hover:bg-green-hover`} disabled={pending} onClick={() => run(() => recomputeResultAction(id), "Live tally refreshed.")}>
              Refresh tally
            </button>
            <button className={`${btn} bg-destructive text-white hover:opacity-90`} disabled={pending} onClick={() => run(() => setProposalStatusAction(id, "closed"), "Voting closed and result computed.")}>
              Close voting
            </button>
          </>
        )}
        {status === "closed" && (
          <>
            <button className={`${btn} border border-line bg-background text-heading hover:bg-card`} disabled={pending} onClick={() => run(() => recomputeResultAction(id), "Result recomputed.")}>
              Recompute result
            </button>
            <button className={`${btn} border border-line bg-background text-heading hover:bg-card`} disabled={pending} onClick={() => run(() => setProposalStatusAction(id, "archived"), "Archived.")}>
              Archive
            </button>
          </>
        )}
        <button className={`${btn} border border-line bg-background text-heading hover:bg-card`} disabled={pending} onClick={processQueue}>
          Process XRPL queue
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-muted-2">{message}</p>}
    </div>
  )
}
