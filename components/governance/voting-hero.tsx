import Link from "next/link"
import { ArrowRight, FileText, Link2, ShieldCheck, UserCheck, Vote, Eye } from "lucide-react"

const PILLARS = [
  { icon: Vote, label: "Transparent Voting" },
  { icon: UserCheck, label: "Member Verification" },
  { icon: Link2, label: "XRP Ledger Anchored" },
  { icon: Eye, label: "Open to Public Audit" },
]

export function VotingHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-r from-gold-tint via-background to-mint">
      <div className="relative h-56 w-full sm:h-72 md:h-80 lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-3/5">
        <img
          src="/images/support-faisal-mosque.png"
          alt="Faisal Mosque, Islamabad"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent lg:hidden" />
        <div className="absolute inset-y-0 left-0 hidden w-1/3 bg-gradient-to-r from-gold-tint to-transparent lg:block" />
      </div>

      <div className="relative flex flex-col gap-8 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-tint px-3 py-1 text-xs font-semibold text-green">
            <ShieldCheck className="size-3.5" aria-hidden /> VAAP Governance
          </p>
          <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-heading sm:text-5xl">
            Transparent.
            <br />
            Member-Led.
            <br />
            <span className="text-green">Blockchain Verified.</span>
          </h1>
          <p className="mt-4 text-pretty leading-relaxed text-muted-2">
            Every VAAP proposal, vote and election result is recorded and anchored to the XRP Ledger — open for anyone
            to inspect and independently verify.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/voting/proposals"
              className="inline-flex items-center gap-2 rounded-xl bg-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
            >
              <Vote className="size-4" aria-hidden /> Browse all proposals <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/voting/verify"
              className="inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-background px-5 py-3 text-sm font-semibold text-green transition-colors hover:bg-gold-tint"
            >
              <ShieldCheck className="size-4" aria-hidden /> Verify a vote record
            </Link>
            <Link
              href="/governance"
              className="inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-background px-5 py-3 text-sm font-semibold text-green transition-colors hover:bg-gold-tint"
            >
              <FileText className="size-4" aria-hidden /> About VAAP governance
            </Link>
          </div>
        </div>

        <aside className="w-full shrink-0 rounded-2xl border border-white/15 bg-green-hover/95 p-6 text-white shadow-xl backdrop-blur lg:w-80">
          <h2 className="font-serif text-2xl leading-snug">On-Chain Governance</h2>
          <ul className="mt-5 flex flex-col gap-4">
            {PILLARS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <Icon className="size-5 text-green-light" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  )
}
