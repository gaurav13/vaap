"use client"

import { useActionState } from "react"
import { BadgeCheck, Search, ShieldCheck, Vote, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { verifyMembership } from "@/app/actions/cms"

const initial = { status: "idle" as const }

export function VerifyForm({
  initialResult,
  initialQuery,
}: {
  initialResult?: any
  initialQuery?: string
}) {
  const [state, action, pending] = useActionState(verifyMembership, (initialResult ?? initial) as any)

  return (
    <div>
      <form action={action} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="query"
          required
          defaultValue={initialQuery ?? ""}
          placeholder="Membership ID (e.g. VAAP-2025-1234) or email"
          className="w-full rounded-lg border border-line bg-card px-4 py-3 text-sm text-heading outline-none transition-colors focus:border-green-border focus:ring-2 focus:ring-green/20"
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          <Search className="size-4" /> {pending ? "Checking…" : "Verify"}
        </Button>
      </form>

      {state.status === "found" && (
        <div className="mt-6 rounded-xl border border-green-border bg-mint/50 p-6">
          <div className="flex items-center gap-2 text-green">
            <BadgeCheck className="size-5" />
            <p className="font-bold">Verified active member</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Name" value={state.member.name} />
            <Info label="Membership ID" value={state.member.membershipId} mono />
            <Info label="Category" value={state.member.category} />
            {state.member.organization && <Info label="Organization" value={state.member.organization} />}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {state.member.goodStanding && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green/15 px-3 py-1 text-xs font-semibold text-green">
                <ShieldCheck className="size-3.5" /> Good standing
              </span>
            )}
            {state.member.votingEligible && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green/15 px-3 py-1 text-xs font-semibold text-green">
                <Vote className="size-3.5" /> Voting eligible
              </span>
            )}
          </div>
        </div>
      )}

      {state.status === "not_found" && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-destructive">
          <XCircle className="size-5" />
          <p className="text-sm font-semibold">
            No active member found for “{state.query}”. Check the ID or email and try again.
          </p>
        </div>
      )}
    </div>
  )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-2">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold text-heading ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  )
}
