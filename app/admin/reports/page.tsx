import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getReports } from "@/app/actions/reports"
import { ReportsManager } from "@/components/admin/reports-manager"

export const metadata = { title: "Reports | VAAP Admin" }

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const session = await getSession()
  if (session?.user?.role !== "admin") redirect("/admin")

  const [{ ref }, rows] = await Promise.all([searchParams, getReports()])

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Reports</h1>
      <p className="mt-1 max-w-2xl text-pretty leading-relaxed text-muted-2">
        Confidential cases submitted through Report a Concern. Reporter details are visible only to administrators and
        are never included in notification emails.
      </p>
      <ReportsManager
        initialRef={ref ?? null}
        items={rows.map((r) => ({
          id: r.id,
          reference: r.reference ?? `#${r.id}`,
          name: r.name,
          email: r.email,
          phone: r.phone,
          category: r.category,
          description: r.description,
          status: r.status,
          statusNote: r.statusNote ?? "",
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
