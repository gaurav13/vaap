import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { SupportHero } from "@/components/support/support-hero"
import { HowWeHelp } from "@/components/support/how-we-help"
import { ComplaintForm } from "@/components/support/complaint-form"
import { CaseHandling } from "@/components/support/case-handling"
import { HelpfulResources } from "@/components/support/helpful-resources"
import { SupportFaq } from "@/components/support/support-faq"

export const metadata = {
  title: "Support | VAAP",
  description:
    "The VAAP Member Support & Grievance Centre — submit a complaint, track your case, and access scam awareness and AML/CFT guidance for a safer digital Pakistan.",
}

export default async function SupportPage() {
  const user = await getHeaderUser()
  return (
    <>
      <SiteHeaderServer active="Support" user={user} />
      <main>
        <SupportHero />
        <HowWeHelp />

        <section className="bg-surface">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-20">
            <ComplaintForm />
            <CaseHandling />
          </div>
        </section>

        <HelpfulResources />
        <SupportFaq />
      </main>
      <SiteFooter />
    </>
  )
}
