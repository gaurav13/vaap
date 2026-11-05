import Image from "next/image"
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  FilePen,
  Globe,
  GraduationCap,
  IdCard,
  Network,
  QrCode,
  Radio,
  Rocket,
  Search,
  ShieldCheck,
  User,
  UserCheck,
  Users,
} from "lucide-react"

const steps = [
  { icon: FilePen, title: "Register", detail: "Individual or Corporate" },
  { icon: ShieldCheck, title: "Verify Identity (KYC / KYB)", detail: "CNIC, NTN & Company Docs" },
  { icon: UserCheck, title: "Admin Review & Approval", detail: "Verification & Membership Category" },
  { icon: IdCard, title: "Get Verified Membership ID", detail: "Unique ID & Digital Certificate" },
  { icon: Network, title: "Access Governance & Services", detail: "Committees, Voting (Eligible Members) & Programs" },
]

const stats = [
  { icon: Users, value: "104", label: "Verified Members" },
  { icon: Building2, value: "64", label: "Corporate Members" },
  { icon: Rocket, value: "18", label: "Startup Members" },
  { icon: User, value: "22", label: "Individual / Professionals" },
  { icon: Radio, value: "120M+", label: "Total Social Reach" },
]

const categories = [
  {
    icon: Building2,
    slug: "corporate",
    title: "Corporate Member",
    note: "(Pakistan registered, with NTN)",
    perks: ["Voting Rights", "Governance Participation"],
  },
  {
    icon: Globe,
    slug: "international",
    title: "International Associate",
    note: "(Non-voting, global firms & partners)",
    perks: ["Industry Participation", "Collaboration"],
  },
  {
    icon: User,
    slug: "individual",
    title: "Individual / Community",
    note: "(Non-voting, investors, professionals)",
    perks: ["Events", "Learning", "Industry Updates"],
  },
  {
    icon: GraduationCap,
    slug: "student",
    title: "Student Member",
    note: "(Non-voting)",
    perks: ["Knowledge Access", "Community Programs"],
  },
]

export function MembershipSystem() {
  return (
    <section aria-labelledby="membership-system-heading" className="bg-[#f4f6f6] pb-14 lg:pb-20">
      <div className="relative overflow-hidden bg-[#071d22] pb-28 pt-10 lg:pb-32 lg:pt-12">
        <Image
          src="/images/pakistan-skyline-watermark.png"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none object-cover object-right-bottom opacity-[0.08]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(184,145,70,0.16),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <span className="inline-flex items-center rounded-full border border-white/30 px-4 py-1 text-sm font-medium text-white/90">
            Membership &amp; Governance
          </span>
          <div className="mt-4 border-l-4 border-gold pl-5">
            <h2
              id="membership-system-heading"
              className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              Governance &amp; Verified <span className="text-[#e3c27a]">Membership System</span>
            </h2>
            <p className="mt-3 max-w-3xl text-pretty text-base leading-relaxed text-white/75 sm:text-lg">
              A transparent, secure and inclusive framework for member verification, participation and industry
              governance.
            </p>
          </div>
        </div>
      </div>

      <div className="relative mx-auto -mt-20 flex max-w-7xl flex-col gap-6 px-5 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-4 shadow-[0_24px_50px_-28px_rgba(7,29,34,0.45)] sm:p-5">
          <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <li key={step.title} className="flex flex-col items-center lg:flex-1 lg:flex-row">
                  <div className="relative flex w-full flex-1 items-center gap-4 self-stretch rounded-2xl border border-line/70 bg-gradient-to-b from-white to-[#f7f8f8] px-5 py-5 lg:flex-col lg:justify-start lg:gap-3 lg:px-3 lg:py-6 lg:text-center">
                    <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-gradient-to-b from-[#e3c27a] to-gold text-xs font-bold text-[#071d22] shadow-sm">
                      {index + 1}
                    </span>
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#eef1f1]">
                      <Icon className="size-7 text-[#071d22]" strokeWidth={1.6} aria-hidden />
                    </span>
                    <div className="pr-8 lg:pr-0">
                      <p className="text-base font-bold leading-snug text-[#071d22]">{step.title}</p>
                      <p className="mt-1.5 text-sm leading-snug text-body">{step.detail}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight
                      className="my-0.5 size-6 shrink-0 rotate-90 text-gold lg:mx-1 lg:my-0 lg:rotate-0"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        <ul className="grid grid-cols-2 gap-y-5 rounded-3xl bg-[#071d22] px-6 py-6 sm:grid-cols-3 lg:flex lg:items-center lg:justify-between lg:px-10">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <li
                key={stat.label}
                className={`flex items-center gap-4 lg:flex-1 lg:justify-center ${
                  index > 0 ? "lg:border-l lg:border-white/15" : ""
                }`}
              >
                <Icon className="size-9 shrink-0 text-[#e3c27a]" strokeWidth={1.6} aria-hidden />
                <div>
                  <p className="text-2xl font-bold leading-none text-white sm:text-3xl">{stat.value}</p>
                  <p className="mt-1.5 text-sm leading-tight text-white/80">{stat.label}</p>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="rounded-3xl bg-white shadow-[0_24px_50px_-30px_rgba(7,29,34,0.4)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <Users className="size-7 text-gold" strokeWidth={1.6} aria-hidden />
                <h3 className="text-2xl font-bold text-[#071d22]">Membership Categories</h3>
              </div>
              <a
                href="#categories"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00343a] underline underline-offset-4 hover:text-gold"
              >
                View Membership Policy
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>
            <ul className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <li key={category.title} className="flex">
                    <a
                      href={`#plan-${category.slug}`}
                      className="group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border border-line/80 bg-gradient-to-br from-white to-gold-tint/60 px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_14px_30px_-20px_rgba(184,145,70,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                    >
                      <Icon
                        className="pointer-events-none absolute -bottom-3 -right-3 size-24 text-gold/10"
                        strokeWidth={1}
                        aria-hidden
                      />
                      <Icon className="mt-0.5 size-9 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
                      <div className="relative min-w-0 flex-1">
                        <p className="text-lg font-bold leading-snug text-[#071d22]">{category.title}</p>
                        <p className="mt-0.5 text-sm leading-snug text-body">{category.note}</p>
                        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                          {category.perks.map((perk) => (
                            <li key={perk} className="flex items-center gap-1.5 text-sm font-medium text-[#071d22]">
                              <Check className="size-4 shrink-0 text-gold" strokeWidth={2.5} aria-hidden />
                              {perk}
                            </li>
                          ))}
                        </ul>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#00343a]/70 group-hover:text-gold">
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

          <div className="relative flex flex-col overflow-hidden rounded-3xl bg-[#071d22] p-6 shadow-[0_24px_50px_-28px_rgba(7,29,34,0.6)] sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(184,145,70,0.22),transparent_60%)]"
            />
            <div className="relative flex items-center gap-3">
              <ShieldCheck className="size-9 shrink-0 text-[#e3c27a]" strokeWidth={1.6} aria-hidden />
              <h3 className="text-2xl font-bold leading-tight text-white sm:text-3xl">Verify a Member</h3>
            </div>
            <p className="relative mt-3 text-base leading-relaxed text-white/80">
              Check the authenticity and status of a VAAP membership.
            </p>

            <form action="/membership/verify" method="get" className="relative mt-6 flex rounded-xl bg-white p-1">
              <label htmlFor="verify-member-id" className="sr-only">
                Membership ID or member name
              </label>
              <span className="flex items-center pl-3 pr-1 text-[#071d22]">
                <User className="size-5" aria-hidden />
              </span>
              <input
                id="verify-member-id"
                name="id"
                required
                placeholder="Enter Membership ID or Member Name"
                className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-heading placeholder:text-body/70 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-b from-[#e3c27a] to-gold px-4 text-[#071d22] transition-opacity hover:opacity-90"
              >
                <Search className="size-5" strokeWidth={2.25} aria-hidden />
                <span className="sr-only">Verify</span>
              </button>
            </form>

            <div className="relative my-6 flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-white/20" />
              <span className="rounded-full border border-gold/70 px-3 py-0.5 text-xs font-semibold text-[#e3c27a]">
                OR
              </span>
              <span className="h-px flex-1 bg-white/20" />
            </div>

            <div className="relative flex flex-1 items-center justify-center gap-5">
              <span className="flex size-20 items-center justify-center rounded-xl border-2 border-dashed border-gold/80">
                <QrCode className="size-12 text-white" strokeWidth={1.4} aria-hidden />
              </span>
              <p className="max-w-40 text-base leading-snug text-white">Scan the QR on membership certificate</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
