import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getSession, isStaff } from "@/lib/session"
import { db } from "@/lib/db"
import { members } from "@/lib/db/schema"
import { ElectionForm } from "@/components/governance/election-form"

export const dynamic = "force-dynamic"

export default async function NewElectionPage() {
  const session = await getSession()
  if (!session?.user || !isStaff(session.user.role)) redirect("/dashboard")

  const rows = await db.select({ category: members.category }).from(members)
  const categories = Array.from(new Set(rows.map((r) => r.category).filter(Boolean)))

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link
        href="/admin/elections"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-heading"
      >
        <ArrowLeft className="size-4" />
        Back to elections
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-heading">New election</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Define the positions and eligibility. You&apos;ll add candidates on the next screen.
      </p>
      <div className="mt-8">
        <ElectionForm categories={categories} />
      </div>
    </div>
  )
}
