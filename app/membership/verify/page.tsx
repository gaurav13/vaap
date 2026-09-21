import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { PageHero } from "@/components/page-hero"
import { getHeaderUser } from "@/lib/header-user"
import { lookupMembership } from "@/app/actions/cms"
import { VerifyForm } from "@/components/member/verify-form"

export const metadata = {
  title: "Verify Membership | VAAP",
  description: "Confirm the status of a VAAP membership by ID or registered email.",
}

export default async function VerifyMembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  const user = await getHeaderUser()
  // When arriving from a certificate QR code (?id=VAAP-…), verify immediately
  // so the scanner sees the result without re-typing the ID.
  const initialResult = id ? await lookupMembership(id) : undefined
  return (
    <>
        <SiteHeaderServer user={user} />
      <main>
        <PageHero
          eyebrow="Membership Verification"
          title="Find & verify a membership"
          description="Confirm whether a membership is active and in good standing using a membership ID or registered email."
        />
        <section className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-20">
          <VerifyForm initialResult={initialResult} initialQuery={id} />
          <p className="mt-8 text-sm text-muted-2">
            Verification only reveals whether a membership is active and in good standing. Personal contact details are
            never shown publicly.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
