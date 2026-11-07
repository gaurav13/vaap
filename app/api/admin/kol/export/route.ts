import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { kolProfiles, members } from "@/lib/db/schema"
import { getSession, isStaff } from "@/lib/session"
import { totalFollowers } from "@/lib/kol"
import { KOL_STATUS_LABEL, platformLabel, type KolStatus } from "@/lib/kol-shared"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const cell = (v: unknown) => {
  let s = String(v ?? "")
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.user || !isStaff(session.user.role)) return new Response("Unauthorized", { status: 401 })
  const status = new URL(request.url).searchParams.get("status")

  const rows = await db
    .select({ kol: kolProfiles, member: members })
    .from(kolProfiles)
    .innerJoin(members, eq(members.id, kolProfiles.memberId))
  const filtered = rows.filter((r) => !status || status === "all" || r.kol.status === status)

  const header = [
    "Member ID", "Name", "Email", "Status", "Title", "Organization", "City", "Expertise",
    "Total Followers", "Monthly Reach", "Platforms", "Identity Verified", "Metrics Verified",
    "Submitted", "Verified", "Expires",
  ]
  const lines = filtered.map(({ kol, member }) =>
    [
      member.membershipId, kol.fullName || member.name, member.email,
      KOL_STATUS_LABEL[kol.status as KolStatus] ?? kol.status, kol.title, kol.organization, kol.city,
      kol.expertise.join("; "), totalFollowers(kol), kol.monthlyReach,
      kol.platforms.map((p) => `${platformLabel(p.platform)}: ${p.followers} (${p.url})`).join("; "),
      kol.identityVerified ? "Yes" : "No", kol.metricsVerified ? "Yes" : "No",
      kol.submittedAt?.toISOString() ?? "", kol.verifiedAt?.toISOString() ?? "", kol.expiresAt?.toISOString() ?? "",
    ]
      .map(cell)
      .join(","),
  )
  const csv = [header.map(cell).join(","), ...lines].join("\n")
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vaap-kols-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
