"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CheckCircle2, LogIn, ShieldCheck, ShieldX, Vote } from "lucide-react"
import { castVoteAction } from "@/app/actions/governance"

type Option = { id: number; label: string }

export type VoterState = {
  loggedIn: boolean
  memberNumber: string | null
  eligible: boolean
  ineligibleReason: string | null
  existingChoice: string | null
  existingReceipt: string | null
  existingVerified: boolean
  allowVoteChanges: boolean
}

const CHOICE_COPY: Record<string, string> = {
  yes: "I support this proposal.",
  no: "I do not support this proposal.",
  abstain: "I choose not to support or oppose this proposal.",
}

export function PublicVotePanel({
  proposalId,
  proposalRef,
  proposalTitle,
  voteType,
  options,
  isOpen,
  closesAtLabel,
  loginHref,
  voter,
}: {
  proposalId: number
  proposalRef: string
  proposalTitle: string
  voteType: string
  options: Option[]
  isOpen: boolean
  closesAtLabel: string
  loginHref: string
  voter: VoterState
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const yesNo = voteType === "yes_no_abstain"

  const [choice, setChoice] = useState<string>("")
  const [optionId, setOptionId] = useState<number | null>(null)
  const [step, setStep] = useState<"select" | "confirm" | "done">("done")
  const [error, setError] = useState("")
  const [receipt, setReceipt] = useState<string | null>(null)

  const alreadyVoted = Boolean(voter.existingReceipt)
  const canStartVote = isOpen && voter.loggedIn && voter.eligible && (!alreadyVoted || voter.allowVoteChanges)
  const selectedLabel = yesNo
    ? choice
    : options.find((o) => o.id === optionId)?.label ?? ""

  // Initialise the flow once we know voting is possible.
  if (canStartVote && step === "done" && !receipt) {
    // start at select
    setStep("select")
  }

  function submit() {
    setError("")
    startTransition(async () => {
      const res = await castVoteAction({
        proposalId,
        choice: yesNo ? choice : "option",
        optionId: yesNo ? null : optionId,
      })
      if (res.ok) {
        setReceipt(res.receiptCode ?? "")
        setStep("done")
        router.refresh()
      } else {
        setError(res.error ?? "Could not record your vote.")
        setStep("select")
      }
    })
  }

  // ---- Voting closed ----------------------------------------------------
  if (!isOpen) {
    return (
      <PanelShell>
        <p className="text-sm text-muted-2">Voting is closed for this proposal.</p>
        <a
          href="#results"
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-line bg-background px-5 py-3 text-sm font-semibold text-heading transition-colors hover:bg-card"
        >
          View results
        </a>
      </PanelShell>
    )
  }

  // ---- Logged out -------------------------------------------------------
  if (!voter.loggedIn) {
    return (
      <PanelShell>
        <Link
          href={loginHref}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
        >
          <LogIn className="size-4" /> Login to vote
        </Link>
        <p className="mt-3 text-center text-xs text-muted-2">
          You will return to this proposal automatically after signing in.
        </p>
        <p className="mt-1 text-center text-xs text-muted-2">Closes {closesAtLabel}</p>
      </PanelShell>
    )
  }

  // ---- Logged in, just voted (success) ----------------------------------
  if (receipt) {
    return (
      <PanelShell>
        <div className="flex items-start gap-3 rounded-xl border border-green-border bg-mint p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green" />
          <div>
            <p className="font-semibold text-heading">Your vote has been recorded</p>
            {voter.memberNumber && (
              <p className="mt-1 text-xs text-muted-2">
                Member Number: <span className="font-mono font-semibold text-heading">{voter.memberNumber}</span>
              </p>
            )}
            <p className="mt-0.5 text-xs text-muted-2">
              Your Vote: <span className="font-semibold uppercase text-heading">{selectedLabel || voter.existingChoice}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-2">
              Vote Receipt: <span className="font-mono font-semibold text-heading">{receipt}</span>
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
              Blockchain Status: PENDING
            </p>
          </div>
        </div>
        <Link
          href={`/governance/verify?code=${receipt}`}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-line bg-background px-5 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-card"
        >
          Verify blockchain record
        </Link>
      </PanelShell>
    )
  }

  // ---- Logged in, already voted previously ------------------------------
  if (alreadyVoted && !voter.allowVoteChanges) {
    return (
      <PanelShell>
        <div className="flex items-start gap-3 rounded-xl border border-green-border bg-mint p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green" />
          <div>
            <p className="font-semibold text-heading">Vote submitted</p>
            {voter.memberNumber && (
              <p className="mt-1 text-xs text-muted-2">
                Member Number: <span className="font-mono font-semibold text-heading">{voter.memberNumber}</span>
              </p>
            )}
            <p className="mt-0.5 text-xs text-muted-2">
              Your Vote: <span className="font-semibold uppercase text-heading">{voter.existingChoice}</span>
            </p>
            {voter.existingVerified ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green">
                <ShieldCheck className="size-3.5" /> XRPL Verified
              </p>
            ) : (
              <p className="mt-1 text-xs font-medium text-amber-600">Blockchain Status: PENDING</p>
            )}
          </div>
        </div>
        {voter.existingReceipt && (
          <Link
            href={`/governance/verify?code=${voter.existingReceipt}`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-line bg-background px-5 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-card"
          >
            View my vote
          </Link>
        )}
      </PanelShell>
    )
  }

  // ---- Logged in, not eligible ------------------------------------------
  if (!voter.eligible) {
    return (
      <PanelShell>
        <div className="flex items-start gap-3 rounded-xl border border-line bg-background p-4">
          <ShieldX className="mt-0.5 size-5 shrink-0 text-muted-2" />
          <div>
            <p className="font-semibold text-heading">You are logged in</p>
            {voter.memberNumber && (
              <p className="mt-1 text-xs text-muted-2">
                Member: <span className="font-mono font-semibold text-heading">{voter.memberNumber}</span>
              </p>
            )}
            <p className="mt-0.5 text-xs text-muted-2">Voting Eligibility: NOT ELIGIBLE</p>
            {voter.ineligibleReason && <p className="mt-1 text-xs text-muted-2">{voter.ineligibleReason}</p>}
          </div>
        </div>
      </PanelShell>
    )
  }

  // ---- Logged in, eligible: cast flow -----------------------------------
  return (
    <PanelShell>
      <div className="mb-3 flex items-start gap-2 rounded-xl border border-green-border bg-mint p-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green" />
        <div className="text-xs">
          <p className="font-semibold text-heading">You are eligible to vote</p>
          {voter.memberNumber && (
            <p className="text-muted-2">
              Member Number: <span className="font-mono font-semibold text-heading">{voter.memberNumber}</span> · Voting
              Right: <span className="font-semibold text-green">APPROVED</span>
            </p>
          )}
        </div>
      </div>

      {step === "confirm" ? (
        <div className="rounded-xl border border-green-border bg-mint p-4">
          <p className="text-sm font-semibold text-heading">Confirm your vote</p>
          <dl className="mt-2 flex flex-col gap-1 text-xs text-muted-2">
            <div className="flex justify-between gap-3">
              <dt>Proposal</dt>
              <dd className="text-right font-medium text-heading">{proposalTitle}</dd>
            </div>
            {voter.memberNumber && (
              <div className="flex justify-between gap-3">
                <dt>Member</dt>
                <dd className="font-mono font-medium text-heading">{voter.memberNumber}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt>Your selection</dt>
              <dd className="font-semibold uppercase text-heading">{selectedLabel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Closes</dt>
              <dd className="text-right font-medium text-heading">{closesAtLabel}</dd>
            </div>
          </dl>
          {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
            >
              {pending ? "Submitting…" : "Confirm & submit vote"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setStep("select")}
              className="rounded-lg border border-line bg-background px-4 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-card"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm font-bold text-heading">Cast your vote</p>
          <div className="flex flex-col gap-2.5">
            {yesNo
              ? (["yes", "no", "abstain"] as const).map((c) => (
                  <label
                    key={c}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                      choice === c ? "border-green bg-mint" : "border-line bg-background hover:border-green/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="choice"
                      value={c}
                      checked={choice === c}
                      onChange={() => setChoice(c)}
                      className="mt-0.5 size-4 accent-[var(--color-green)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold uppercase text-heading">{c}</span>
                      <span className="block text-xs text-muted-2">{CHOICE_COPY[c]}</span>
                    </span>
                  </label>
                ))
              : options.map((o) => (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm font-medium transition-colors ${
                      optionId === o.id ? "border-green bg-mint text-heading" : "border-line bg-background text-heading hover:border-green/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="option"
                      checked={optionId === o.id}
                      onChange={() => setOptionId(o.id)}
                      className="size-4 accent-[var(--color-green)]"
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
          </div>
          {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          <button
            type="button"
            disabled={!selectedLabel}
            onClick={() => {
              setError("")
              setStep("confirm")
            }}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-50"
          >
            <Vote className="size-4" /> Continue
          </button>
        </>
      )}
    </PanelShell>
  )
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-card p-5">{children}</div>
}
