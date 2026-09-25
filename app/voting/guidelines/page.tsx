import Link from "next/link"
import { VotingSectionShell } from "@/components/governance/voting-section-shell"

export const metadata = {
  title: "Voting Guidelines | VAAP Voting",
  description: "Eligibility, rules and the voting process for VAAP governance and elections.",
}

const SECTIONS = [
  {
    title: "Who can vote",
    points: [
      "You must be an approved VAAP member with an active membership.",
      "The Super Admin grants two separate rights: a Governance voting right (proposals) and an Election voting right (office-bearer elections).",
      "Some proposals are restricted to specific membership categories. The proposal page shows whether you are eligible.",
      "You can check your current rights anytime under Dashboard, Voting Status.",
    ],
  },
  {
    title: "Voting rules",
    points: [
      "One member, one vote. Votes are not weighted by holdings, tokens or XRP balance.",
      "You can only vote while a proposal is open, between its opening and closing times.",
      "Whether you may change your vote before the deadline depends on the rule set for each proposal.",
      "Election ballots are secret: your selection is encrypted and never linked to your identity in results.",
    ],
  },
  {
    title: "How to vote",
    points: [
      "Open Active Votes and choose a proposal.",
      "Sign in with your member account. You will be returned to the proposal afterwards.",
      "Pick your option, review it, and confirm.",
      "Keep your receipt ID. You can use it to verify that your vote was recorded.",
    ],
  },
  {
    title: "Results and verification",
    points: [
      "When voting closes, results are tallied and published on Voting Results.",
      "Vote records and final results are anchored on the XRP Ledger by VAAP. Members do not need a wallet or XRP.",
      "Anyone can confirm an anchor or receipt on the verification page.",
    ],
  },
]

export default function VotingGuidelinesPage() {
  return (
    <VotingSectionShell
      currentHref="/voting/guidelines"
      title="Voting Guidelines"
      description="Everything you need to know about eligibility, the rules that apply, and how the voting process works."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <section key={s.title} className="rounded-2xl border border-line bg-background p-6">
            <h2 className="text-lg font-bold text-heading">{s.title}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-muted-2">
              {s.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-green" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/voting/active"
          className="rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-hover"
        >
          See Active Votes
        </Link>
        <Link
          href="/voting/verify"
          className="rounded-lg border border-line bg-background px-5 py-2.5 text-sm font-semibold text-heading hover:bg-card"
        >
          Verify a receipt
        </Link>
      </div>
    </VotingSectionShell>
  )
}
