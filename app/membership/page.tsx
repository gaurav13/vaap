import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { MembershipHero } from "@/components/membership/membership-hero"
import { MembershipSystem } from "@/components/membership/membership-system"
import { MembershipTypes, type MembershipPlan } from "@/components/membership/membership-types"
import { MembershipEligibility } from "@/components/membership/membership-eligibility"
import { MembershipProcess } from "@/components/membership/membership-process"
import { MembershipBenefits } from "@/components/membership/membership-benefits"
import { MembershipFaq } from "@/components/membership/membership-faq"
import { getHeaderUser } from "@/lib/header-user"
import { getMembershipFaqs } from "@/app/actions/cms"
import { renderRichContent } from "@/lib/rich-content"
import { db } from "@/lib/db"
import { membershipPlans } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getMembershipSettings } from "@/lib/site-settings"
import { withPromotions } from "@/lib/promotions"
import { seoMetadata } from "@/lib/seo"
import { staticSubjectByPath } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"

function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

export function generateMetadata() {
  return seoMetadata(staticSubjectByPath('/membership'))
}

export default async function MembershipPage() {
  const [user, header, rows, faqRows] = await Promise.all([
    getHeaderUser(),
    getMembershipSettings(),
    db.select().from(membershipPlans).where(eq(membershipPlans.published, true)),
    getMembershipFaqs(),
  ])

  const faqs = faqRows.map((row) => ({
    id: row.id,
    question: row.question,
    answerHtml: renderRichContent(row.answer),
  }))

  const priced = await withPromotions(rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
  const plans: MembershipPlan[] = priced.map((row) => ({
      promotion: row.promotion,
      id: row.id,
      icon: row.icon,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      annualFee: row.annualFee,
      annualFeeNote: row.annualFeeNote,
      admissionFee: row.admissionFee,
      admissionFeeNote: row.admissionFeeNote,
      term: row.term,
      benefits: toLines(row.benefits),
      eligibility: toLines(row.eligibility),
    }))

  return (
    <>
      <SeoJsonLd subject={staticSubjectByPath('/membership')} />
    <>
      <SiteHeaderServer active="Membership" user={user} />
      <main>
        <MembershipHero />
        <MembershipSystem />
        <MembershipBenefits />
        <MembershipProcess />
        <MembershipEligibility />
        <MembershipTypes plans={plans} header={header} />
        <MembershipFaq
          faqs={faqs}
          header={{
            faqEyebrow: header.faqEyebrow,
            faqHeading: header.faqHeading,
            faqDescription: header.faqDescription,
            faqCtaLabel: header.faqCtaLabel,
            faqCtaHref: header.faqCtaHref,
          }}
        />
      </main>
      <SiteFooter />
    </>
    </>
  )
}
