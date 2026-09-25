import { BarChart3, CalendarDays, Network, Users, Vote } from "lucide-react"

type Stats = {
  activeVotes: number
  eligibleMembers: number
  totalVotesCast: number
  activeElections: number
  xrplVerifiedRecords: number
}

export function VotingStats({ stats }: { stats: Stats }) {
  const items = [
    { icon: Vote, value: stats.activeVotes, label: "Active Votes", hint: "Currently open for voting" },
    { icon: Users, value: stats.eligibleMembers, label: "Eligible Members", hint: "Can participate in voting" },
    { icon: BarChart3, value: stats.totalVotesCast, label: "Total Votes Cast", hint: "Across all active votes" },
    { icon: CalendarDays, value: stats.activeElections, label: "Active Elections", hint: "Ongoing elections" },
    { icon: Network, value: stats.xrplVerifiedRecords, label: "XRPL Verified Records", hint: "On-chain recorded results" },
  ]

  return (
    <section aria-label="Voting statistics" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {items.map(({ icon: Icon, value, label, hint }) => (
        <div key={label} className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4">
          <Icon className="mt-1 size-8 shrink-0 text-green" aria-hidden />
          <div className="min-w-0">
            <p className="font-serif text-3xl font-bold tabular-nums text-heading">{value.toLocaleString("en-US")}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-heading">{label}</p>
            <p className="mt-0.5 text-xs text-green">{hint}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
