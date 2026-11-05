import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CircleCheck,
  CreditCard,
  FilePen,
  Globe,
  GraduationCap,
  QrCode,
  Search,
  ShieldCheck,
  User,
  Users,
} from "lucide-react"

const steps = [
  { icon: FilePen, title: "Register", detail: "(Individual or Corporate)" },
  { icon: BadgeCheck, title: "Verify Identity (KYC / KYB)", detail: "CNIC, NTN & Company Docs" },
  { icon: CircleCheck, title: "Admin Review & Approval", detail: "Verification & Membership Category" },
  { icon: CreditCard, title: "Get Verified Membership ID", detail: "Unique ID & Digital Certificate" },
  { icon: Users, title: "Access Governance & Services", detail: "Committees, Voting (Eligible Members)" },
]

const categories = [
  { icon: Building2, slug: "corporate", title: "Corporate Member", note: "(Pakistan registered, with NTN)", perk: "Voting Rights" },
  { icon: Globe, slug: "international", title: "International Associate", note: "(Non-voting, global firms & partners)", perk: "Industry Participation" },
  { icon: User, slug: "individual", title: "Individual / Community", note: "(Non-voting, investors, professionals)", perk: "Events, Learning & Updates" },
  { icon: GraduationCap, slug: "student", title: "Student Member", note: "(Non-voting)", perk: "Knowledge & Community Access" },
]

const cardShell = "rounded-3xl border border-line bg-white shadow-[0_18px_40px_-28px_rgba(27,67,50,0.45)]"

export function MembershipSystem() {
  return (
    <section aria-labelledby="membership-system-heading" className="bg-[#f6f8f7] py-12 lg:py-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:px-6 lg:px-8">
        <div className={`${cardShell} p-6 sm:p-10`}>
          <h2
            id="membership-system-heading"
            className="text-balance text-3xl font-bold tracking-tight text-[#1b4332] sm:text-4xl"
          >
            Governance &amp; Verified Membership System
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-body sm:text-lg">
            A transparent and secure framework for member verification, participation and industry governance.
          </p>

          <ol className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-0">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <li key={step.title} className="flex flex-col items-center lg:flex-1 lg:flex-row">
                  <div className="flex w-full flex-1 flex-row items-center gap-4 self-stretch rounded-2xl border border-line bg-white px-5 py-5 shadow-[0_6px_18px_-12px_rgba(27,67,50,0.35)] transition-shadow hover:shadow-[0_12px_28px_-14px_rgba(27,67,50,0.45)] lg:flex-col lg:justify-center lg:gap-4 lg:px-4 lg:py-8 lg:text-center">
                    <Icon className="size-9 shrink-0 text-[#1b4332] lg:size-10" strokeWidth={1.5} aria-hidden />
                    <div>
                      <p className="text-base font-semibold leading-snug text-[#1b4332]">{step.title}</p>
                      <p className="mt-1.5 text-sm leading-snug text-body">{step.detail}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight
                      className="my-1 size-4 shrink-0 rotate-90 text-[#1b4332] lg:mx-2 lg:my-0 lg:rotate-0"
                      aria-hidden
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className={`${cardShell} overflow-hidden`}>
            <div className="flex items-center gap-3 border-b border-line px-6 py-5 sm:px-8">
              <Users className="size-6 text-[#1b4332]" strokeWidth={1.5} aria-hidden />
              <h3 className="text-xl font-semibold text-[#1b4332]">Membership Categories</h3>
            </div>
            <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <li key={category.title} className="flex">
                    <a
                      href={`#plan-${category.slug}`}
                      className="group flex w-full items-start gap-4 rounded-2xl border border-line bg-white px-5 py-4 transition-colors hover:border-[#1b4332]/30 hover:bg-[#f6f8f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b4332]/40"
                    >
                      <Icon className="mt-0.5 size-7 shrink-0 text-[#1b4332]" strokeWidth={1.5} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold leading-snug text-[#1b4332]">{category.title}</p>
                        <p className="mt-0.5 text-sm leading-snug text-body">{category.note}</p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-[#1b4332]">
                          <Check className="size-4 shrink-0" aria-hidden />
                          {category.perk}
                        </p>
                        <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#1b4332]/80 group-hover:text-[#1b4332]">
                          View fees &amp; details
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </span>
                      </div>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className={`${cardShell} flex flex-col p-6 sm:p-8`}>
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-7 shrink-0 text-[#1b4332]" strokeWidth={1.5} aria-hidden />
              <h3 className="text-2xl font-bold leading-tight text-[#1b4332]">Verify a Member</h3>
            </div>
            <p className="mt-4 text-base leading-relaxed text-heading">Check the authenticity of a VAAP membership.</p>

            <form action="/membership/verify" method="get" className="mt-6 flex">
              <label htmlFor="verify-member-id" className="sr-only">
                Membership ID
              </label>
              <input
                id="verify-member-id"
                name="id"
                required
                placeholder="Enter Membership ID"
                className="min-w-0 flex-1 rounded-l-xl border border-r-0 border-line bg-white px-4 py-3 text-base text-heading placeholder:text-body/70 focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-r-xl bg-[#1b4332] px-5 text-white transition-colors hover:bg-[#143728]"
              >
                <Search className="size-5" aria-hidden />
                <span className="sr-only">Verify</span>
              </button>
            </form>

            <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <QrCode className="size-14 text-[#1b4332]" strokeWidth={1.25} aria-hidden />
              <p className="text-base leading-snug text-[#1b4332]">Or scan the QR on membership certificate</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
