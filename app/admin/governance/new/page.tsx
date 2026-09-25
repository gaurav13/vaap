import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { membershipPlans } from "@/lib/db/schema"
import { ProposalForm } from "@/components/governance/proposal-form"

export const dynamic = "force-dynamic"

export default async function NewProposalPage() {
  const plans = await db.select().from(membershipPlans)
  const categories = Array.from(new Set(plans.map((p) => p.title).filter(Boolean)))

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/admin/governance"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-2 hover:text-heading"
      >
        <ArrowLeft className="size-4" /> Back to proposals
      </Link>
      <h1 className="text-2xl font-bold text-heading">New proposal</h1>
      <p className="mb-6 mt-1 text-sm text-muted-2">
        Draft a resolution, choose how members vote, and decide what gets anchored to the XRP Ledger.
      </p>
      <ProposalForm categories={categories} />
    </div>
  )
}
