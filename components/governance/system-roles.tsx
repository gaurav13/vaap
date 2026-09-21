import { ShieldCheck, UsersRound, TrendingUp, type LucideIcon } from "lucide-react"

type Role = {
  num: string
  icon: LucideIcon
  eyebrow: string
  title: string
  sub: string
  card: string
}

const ROLES: Role[] = [
  {
    num: "01",
    icon: ShieldCheck,
    eyebrow: "Regulatory Oversight",
    title: "PVARA",
    sub: "Rules \u00b7 Licensing \u00b7 Supervision",
    card: "bg-blue-tint",
  },
  {
    num: "02",
    icon: UsersRound,
    eyebrow: "Industry Representation",
    title: "VAAP",
    sub: "Representation \u00b7 Coordination \u00b7 Dialogue",
    card: "bg-mint",
  },
  {
    num: "03",
    icon: TrendingUp,
    eyebrow: "Industry Participation",
    title: "Companies \u00b7 Startups \u00b7 Professionals",
    sub: "Innovation \u00b7 Services \u00b7 Expertise",
    card: "bg-gold-tint",
  },
]

export function SystemRoles() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1440px] px-6 py-10 lg:px-16 lg:py-12">
        {/* Heading row */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="lg:max-w-[55%]">
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-green">How The System Works</p>
              <span aria-hidden className="h-0.5 w-9 bg-green" />
            </div>
            <h2 className="mt-3 text-pretty font-serif text-3xl font-bold leading-tight tracking-tight text-heading lg:text-[2.25rem]">
              Three Complementary Roles. One Stronger Pakistan.
            </h2>
          </div>
          <p className="text-pretty text-base leading-relaxed text-body lg:mt-1 lg:max-w-[38%]">
            Regulation and industry representation serve different, complementary roles within the same ecosystem.
          </p>
        </div>

        {/* Three cards */}
        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-0">
          {ROLES.map(({ num, icon: Icon, eyebrow, title, sub, card }, i) => (
            <div key={num} className="flex flex-col items-center lg:flex-1 lg:flex-row">
              <div className={`flex w-full items-center gap-5 rounded-xl p-6 ${card}`}>
                <span className="text-3xl font-extrabold tabular-nums text-green">{num}</span>
                <Icon className="size-14 shrink-0 text-green" strokeWidth={1.75} aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-green">{eyebrow}</p>
                  <p className="mt-1 text-lg font-extrabold leading-tight text-heading">{title}</p>
                  <p className="mt-1 text-sm text-body">{sub}</p>
                </div>
              </div>
              {i < ROLES.length - 1 && (
                <>
                  <span
                    aria-hidden
                    className="hidden h-px w-10 shrink-0 border-t-2 border-dotted border-muted-2/50 lg:block"
                  />
                  <span
                    aria-hidden
                    className="h-6 w-px border-l-2 border-dotted border-muted-2/50 lg:hidden"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
