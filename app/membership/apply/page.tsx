import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { ApplyWizard, type ApplyPlan } from "@/components/membership/apply/apply-wizard"
import { getHeaderUser } from "@/lib/header-user"
import { getMembershipPlans } from "@/app/actions/cms"

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
  searchParams: Promise<{ plan?: string }>
}) {
  const [user, rows, sp] = await Promise.all([getHeaderUser(), getMembershipPlans(), searchParams])

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
  const initialPlanId = Number.isFinite(parsedPlanId) ? parsedPlanId : null

  return (
    <>
      <SiteHeaderServer active="Membership" user={user} />
      <main className="bg-muted/40">
        <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-14">
          <ApplyWizard plans={plans} initialPlanId={initialPlanId} />
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
