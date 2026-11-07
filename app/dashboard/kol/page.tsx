import Link from "next/link"
import { and, eq, isNull } from "drizzle-orm"
import { BadgeCheck } from "lucide-react"
import { db } from "@/lib/db"
import { members } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { getKolByMemberId, ownershipCode } from "@/lib/kol"
import { PageHeading } from "@/components/member/page-heading"
import { KolWorkspace, type WorkspaceProfile } from "@/components/kol/kol-workspace"
import type { KolStatus } from "@/lib/kol-shared"

export const dynamic = "force-dynamic"

export const metadata = { title: "KOL Verification | VAAP" }

const iso = (d: Date | null) => (d ? d.toISOString() : null)

export default async function DashboardKolPage() {
  const session = await getSession()
  const [member] = session?.user
    ? await db
        .select()
        .from(members)
        .where(and(eq(members.userId, session.user.id), isNull(members.deletedAt)))
        .limit(1)
    : []

  const heading = (
    <PageHeading
      title="KOL Verification"
      description="Apply to join VAAP's network of Verified Opinion Leaders and earn the verified badge on your public profile."
    />
  )

  if (!member || member.status !== "active") {
    return (
      <div className="mx-auto max-w-2xl">
        {heading}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-card p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-mint">
            <BadgeCheck className="size-6 text-green" aria-hidden="true" />
          </span>
          <p className="text-pretty text-sm leading-relaxed text-body">
            KOL verification is open to active VAAP members. Once your membership is approved and active, you can
            apply here.
          </p>
          <Link href="/dashboard/membership" className="text-sm font-semibold text-green hover:text-green-hover">
            View membership status
          </Link>
        </div>
      </div>
    )
  }

  const kol = await getKolByMemberId(member.id)
  const profile: WorkspaceProfile = {
    slug: kol?.slug ?? "",
    status: (kol?.status ?? "draft") as KolStatus,
    adminNote: kol?.adminNote ?? "",
    evidence: kol?.evidence ?? [],
    submittedAt: iso(kol?.submittedAt ?? null),
    verifiedAt: iso(kol?.verifiedAt ?? null),
    expiresAt: iso(kol?.expiresAt ?? null),
    fullName: kol?.fullName || member.name,
    professionalName: kol?.professionalName ?? "",
    photo: kol?.photo ?? "",
    country: kol?.country || "Pakistan",
    city: kol?.city ?? "",
    organization: kol?.organization ?? "",
    title: kol?.title ?? "",
    bio: kol?.bio ?? "",
    expertise: kol?.expertise ?? [],
    platforms: kol?.platforms ?? [],
    monthlyReach: kol?.monthlyReach ?? 0,
    mediaAppearances: kol?.mediaAppearances ?? "",
    collaborations: kol?.collaborations ?? "",
    achievements: kol?.achievements ?? "",
    collabInterests: kol?.collabInterests ?? "",
    evidenceNotes: kol?.evidenceNotes ?? "",
  }

  return (
    <div className="mx-auto max-w-4xl">
      {heading}
      <KolWorkspace profile={profile} ownershipCode={ownershipCode(member.id)} />
    </div>
  )
}
