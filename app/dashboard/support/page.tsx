import { redirect } from "next/navigation"
import { Mail, MessageSquare, Phone } from "lucide-react"
import { getSession } from "@/lib/session"
import { PageHeading } from "@/components/member/page-heading"
import { SupportForm } from "@/components/member/support-form"
import { MemberGuide } from "@/components/member/member-guide"

const FAQS = [
  {
    q: "How do I renew my membership?",
    a: "Go to Membership and click Request renewal. Our team will confirm your new term and update your expiry date.",
  },
  {
    q: "When can I vote in VAAP elections?",
    a: "You must hold an active membership in good standing and be approved for voting eligibility. Check Voting Status for your current criteria.",
  },
  {
    q: "How do I download my certificate?",
    a: "Your official membership certificate is available on the Membership page once your membership is active.",
  },
]

export default async function SupportPage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")
  const user = session.user

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeading title="Support" description="Get help from the VAAP team or browse common questions." />

      <div className="mb-6">
        <MemberGuide />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-heading">
              <MessageSquare className="size-4 text-green" /> Contact support
            </h2>
            <p className="mb-5 mt-1 text-sm text-muted-2">
              Send us a message and our team will respond within 1–2 business days.
            </p>
            <SupportForm name={user.name ?? "Member"} email={user.email} />
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="text-base font-bold text-heading">Reach us directly</h2>
            <ul className="mt-4 flex flex-col gap-4 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-mint text-green">
                  <Mail className="size-4" />
                </span>
                <a href="mailto:support@vaap.pk" className="text-heading hover:text-green">
                  support@vaap.pk
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-mint text-green">
                  <Phone className="size-4" />
                </span>
                <span className="text-heading">+92 51 000 0000</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="text-base font-bold text-heading">Frequently asked</h2>
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {FAQS.map((f) => (
                <li key={f.q} className="py-3">
                  <p className="text-sm font-semibold text-heading">{f.q}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-2">{f.a}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
