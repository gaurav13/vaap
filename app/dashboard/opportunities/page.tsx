import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Handshake, Lightbulb, Rocket } from "lucide-react"
import { getSession } from "@/lib/session"
import { PageHeading } from "@/components/member/page-heading"

const OPPS = [
  {
    icon: Rocket,
    title: "Startup Accelerator Program",
    status: "Applications Open",
    body: "A 12-week program supporting early-stage virtual asset startups with mentorship, regulatory guidance, and access to VAAP's partner network.",
  },
  {
    icon: Handshake,
    title: "Industry Collaboration",
    status: "Partner with VAAP",
    body: "Co-develop standards, host joint events, and shape policy alongside VAAP and its member organizations across Pakistan's virtual asset sector.",
  },
  {
    icon: Lightbulb,
    title: "Research Contribution",
    status: "Share Your Insights",
    body: "Contribute to VAAP research reports and whitepapers. Submit findings, case studies, and analysis to inform the wider community.",
  },
]

export default async function OpportunitiesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeading
        title="Opportunities"
        description="Programs, partnerships, and ways to get more involved with VAAP."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {OPPS.map((o) => {
          const Icon = o.icon
          return (
            <article key={o.title} className="flex flex-col rounded-2xl border border-line bg-card p-6">
              <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-mint text-green">
                <Icon className="size-6" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-green">{o.status}</span>
              <h2 className="mt-1 text-base font-bold text-heading text-balance">{o.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-2">{o.body}</p>
              <Link
                href="/dashboard/support"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:text-green-hover"
              >
                Express interest <ArrowRight className="size-4" />
              </Link>
            </article>
          )
        })}
      </div>
    </div>
  )
}
