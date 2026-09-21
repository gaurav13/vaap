import { redirect } from "next/navigation"
import Link from "next/link"
import { FileCheck2 } from "lucide-react"
import { getSession } from "@/lib/session"
import { getMyApplications } from "@/app/actions/member"
import { PageHeading } from "@/components/member/page-heading"

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green/15 text-green",
  rejected: "bg-destructive/10 text-destructive",
}

export default async function ApplicationsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const apps = await getMyApplications(session.user.email)

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeading title="My Applications" description="Track your membership and renewal applications." />

      {apps.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-card p-12 text-center">
          <FileCheck2 className="size-8 text-muted-2" />
          <p className="text-sm font-semibold text-heading">No applications yet</p>
          <p className="max-w-sm text-sm text-muted-2">
            When you apply for membership or submit a renewal, it will appear here with its current status.
          </p>
          <Link
            href="/membership"
            className="mt-2 inline-flex rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-hover"
          >
            Apply for membership
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <ul className="flex flex-col divide-y divide-line">
            {apps.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-heading">{a.category}</p>
                  <p className="truncate text-xs text-muted-2">
                    {a.message || "Membership application"} ·{" "}
                    {new Date(a.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold capitalize ${
                    STATUS_STYLES[a.status] ?? "bg-muted text-muted-2"
                  }`}
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
