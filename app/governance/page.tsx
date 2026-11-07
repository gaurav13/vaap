import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { getDocuments } from "@/app/actions/cms"
import { GovernanceHero } from "@/components/governance/governance-hero"
import { NationalEcosystem } from "@/components/governance/national-ecosystem"
import { SystemRoles } from "@/components/governance/system-roles"
import { VaapGovernance } from "@/components/governance/vaap-governance"
import { GovernanceDocuments } from "@/components/governance/governance-in-action"
import { seoMetadata } from "@/lib/seo"
import { staticSubjectByPath } from "@/lib/seo/subjects"
import { SeoJsonLd } from "@/components/seo/json-ld"

export function generateMetadata() {
  return seoMetadata(staticSubjectByPath('/governance'))
}

export default async function GovernanceFrameworkPage() {
  const [user, documents] = await Promise.all([getHeaderUser(), getDocuments()])

  return (
    <>
      <SeoJsonLd subject={staticSubjectByPath('/governance')} />
    <>
      <SiteHeaderServer active="Governance" user={user} />
      <main>
        <GovernanceHero />
        <NationalEcosystem />
        <SystemRoles />
        <VaapGovernance />
        <GovernanceDocuments documents={documents} />
      </main>
      <SiteFooter />
    </>
    </>
  )
}
