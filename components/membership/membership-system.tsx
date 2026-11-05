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
  { icon: FilePen, title: "Register", detail: "(Individual or Corporate)", strong: true },
  { icon: BadgeCheck, title: "Verify Identity (KYC / KYB)", detail: "CNIC, NTN & Company Docs" },
  { icon: CircleCheck, title: "Admin Review & Approval", detail: "Verification & Membership Category" },
  { icon: CreditCard, title: "Get Verified Membership ID", detail: "Unique ID & Digital Certificate" },
  { icon: Users, title: "Access Governance & Services", detail: "Committees, Voting (Eligible Members)" },
]

const categories = [
  { icon: Building2, title: "Corporate Member", note: "(Pakistan registered, with NTN)", perk: "Voting Rights" },
  { icon: Globe, title: "International Associate", note: "(Non-voting, global firms & partners)", perk: "Industry Participation" },
  { icon: User, title: "Individual / Community", note: "(Non-voting, investors, professionals)", perk: "Events, Learning & Updates" },
  { icon: GraduationCap, title: "Student Member", note: "(Non-voting)", perk: "Knowledge & Community Access" },
]

const cardShell = "rounded-2xl border border-line bg-white shadow-[0_10px_30px_-18px_rgba(27,67,50,0.35)]"

export function MembershipSystem() {
  return (
    <section aria-labelledby="membership-system-heading" className="bg-[#f6f8f7] py-12 lg:py-16">
      <div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:px-8 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className={`${cardShell} p-6 sm:p-8 lg:col-span-2 xl:col-span-1`}>
          <h2
            id="membership-system-heading"
            className="text-balance text-2xl font-bold tracking-tight text-[#1b4332] sm:text-3xl"
          >
            Governance &amp; Verified Membership System
          </h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-body sm:text-base">
            A transparent and secure framework for member verification, participation and industry governance.
          </p>

          <ol className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-0">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <li key={step.title} className="flex flex-col items-center sm:flex-1 sm:flex-row">
                  <div className="flex w-full flex-1 flex-row items-center gap-4 self-stretch rounded-xl border border-line bg-white px-4 py-4 shadow-sm sm:flex-col sm:justify-center sm:gap-3 sm:px-2 sm:py-5 sm:text-center">
                    <Icon className="size-8 shrink-0 text-[#1b4332] sm:size-9" strokeWidth={1.5} aria-hidden />
                    <div>
                      <p className="text-sm font-semibold leading-snug text-heading">{step.title}</p>
                      <p className="mt-1 text-xs leading-snug text-body">{step.detail}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight
                      className="my-1 size-4 shrink-0 rotate-90 text-[#1b4332] sm:mx-1 sm:my-0 sm:rotate-0"
                      aria-hidden
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        <div className={`${cardShell} overflow-hidden`}>
          <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
            <Users className="size-5 text-[#1b4332]" aria-hidden />
            <h3 className="text-base font-semibold text-[#1b4332]">Membership Categories</h3>
          </div>
          <ul className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-1">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <li
                  key={category.title}
                  className="flex items-start gap-3 rounded-xl border border-line/70 bg-white px-3 py-2.5"
                >
                  <Icon className="mt-1 size-6 shrink-0 text-[#1b4332]" strokeWidth={1.5} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-heading">{category.title}</p>
                    <p className="text-xs leading-snug text-body">{category.note}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#1b4332]">
                      <Check className="size-3.5" aria-hidden />
                      {category.perk}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className={`${cardShell} flex flex-col bg-[#f1f6f3] p-6`}>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-6 shrink-0 text-[#1b4332]" aria-hidden />
            <h3 className="text-lg font-bold leading-tight text-[#1b4332]">Verify a Member</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-heading">Check the authenticity of a VAAP membership.</p>

          <form action="/membership/verify" method="get" className="mt-5 flex">
            <label htmlFor="verify-member-id" className="sr-only">
              Membership ID
            </label>
            <input
              id="verify-member-id"
              name="id"
              required
              placeholder="Enter Membership ID"
              className="min-w-0 flex-1 rounded-l-lg border border-r-0 border-line bg-white px-3 py-2.5 text-sm text-heading placeholder:text-body/70 focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-r-lg bg-[#1b4332] px-3 text-white transition-colors hover:bg-[#143728]"
            >
              <Search className="size-4" aria-hidden />
              <span className="sr-only">Verify</span>
            </button>
          </form>

          <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <QrCode className="size-12 text-[#1b4332]" strokeWidth={1.25} aria-hidden />
            <p className="text-sm leading-snug text-[#1b4332]">Or scan the QR on membership certificate</p>
          </div>
        </div>
      </div>
    </section>
  )
}
