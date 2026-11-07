import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { ApplyWizard, type ApplyPlan, type ResumeApplication } from "@/components/membership/apply/apply-wizard"
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { membershipApplications } from "@/lib/db/schema"
import { verifyToken } from "@/lib/email-tokens"
import { getHeaderUser } from "@/lib/header-user"
import { getMembershipPlans } from "@/app/actions/cms"

async function loadResume(token: string | undefined): Promise<{ category: string; draft: ResumeApplication } | null> {
  const payload = verifyToken(token, "resume")
  const id = payload?.id ? Number.parseInt(payload.id, 10) : NaN
  if (!payload || !Number.isFinite(id)) return null
  const [row] = await db
    .select()
    .from(membershipApplications)
    .where(
      and(
        eq(membershipApplications.id, id),
        eq(membershipApplications.completed, false),
        sql`lower(${membershipApplications.email}) = ${payload.email}`,
      ),
    )
    .limit(1)
  if (!row) return null
  return {
    category: row.category,
    draft: {
      applicationId: row.id,
      values: {
        companyName: row.organization ?? "",
        registrationNumber: row.registrationNumber ?? "",
        website: row.website ?? "",
        industrySector: row.industrySector ?? "",
        fullName: row.name ?? "",
        designation: row.designation ?? "",
        email: row.email,
        phone: row.phone ?? "",
        cnic: row.cnic ?? "",
      },
    },
  }
}

function toLines(value: string | null): string[] {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

export const metadata = {
  title: "Apply for Membership | VAAP",
  description:
    "Apply for VAAP membership in a few simple steps — select your membership type, share your details, and submit for review.",
}

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; resume?: string }>
}) {
  const [user, rows, sp] = await Promise.all([getHeaderUser(), getMembershipPlans(), searchParams])
  const resume = await loadResume(sp.resume)

  const plans: ApplyPlan[] = rows.map((row) => ({
    id: row.id,
    icon: row.icon,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    admissionFee: row.admissionFee,
    admissionFeeNote: row.admissionFeeNote,
    annualFee: row.annualFee,
    annualFeeNote: row.annualFeeNote,
    term: row.term,
    benefits: toLines(row.benefits),
    eligibility: toLines(row.eligibility),
  }))

  const parsedPlanId = sp.plan ? Number.parseInt(sp.plan, 10) : NaN
  const resumePlanId = resume ? plans.find((p) => p.title === resume.category)?.id ?? null : null
  const initialPlanId = Number.isFinite(parsedPlanId) ? parsedPlanId : resumePlanId

  return (
    <>
      <SiteHeaderServer active="Membership" user={user} />
      <main className="bg-muted/40">
        <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-14">
          <ApplyWizard plans={plans} initialPlanId={initialPlanId} resume={resume?.draft ?? null} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
