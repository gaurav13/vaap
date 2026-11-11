import Link from "next/link"
import { ArrowRight, Award, Check, CreditCard, FileText, Info, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

type StepStatus = "completed" | "next" | "pending"

type Step = {
  title: string
  icon: typeof FileText
  done: boolean
}

type NextAction = {
  title: string
  description: string
  cta?: { label: string; href: string }
}

export function MembershipJourney({
  profileComplete,
  applied,
  paid,
  verified,
}: {
  profileComplete: boolean
  applied: boolean
  paid: boolean
  verified: boolean
}) {
  const steps: Step[] = [
    { title: "Complete Your Profile", icon: UserRound, done: profileComplete },
    { title: "Apply for Membership", icon: FileText, done: applied },
    { title: "Pay Membership Fee", icon: CreditCard, done: paid },
    { title: "Verified VAAP Member", icon: Award, done: verified },
  ]
  const nextIndex = steps.findIndex((s) => !s.done)
  const completedCount = steps.filter((s) => s.done).length
  const statusOf = (i: number): StepStatus =>
    steps[i].done ? "completed" : i === nextIndex ? "next" : "pending"

  const nextActions: NextAction[] = [
    {
      title: "Complete Your Profile",
      description: "Add your phone, city and professional details so we can process your membership.",
      cta: { label: "Complete Profile", href: "/dashboard/profile" },
    },
    {
      title: "Apply for Membership",
      description: "You have completed your profile. Now apply for a VAAP membership to proceed to payment.",
      cta: { label: "Apply for Membership", href: "/dashboard/membership" },
    },
    {
      title: "Pay Membership Fee",
      description: "Your application is saved. Pay the membership fee to send it for review.",
      cta: { label: "Pay Membership Fee", href: "/dashboard/membership" },
    },
    {
      title: "Awaiting Approval",
      description: "Payment received. Our team is reviewing your application and will notify you once approved.",
    },
  ]
  const action = nextIndex === -1 ? null : nextActions[nextIndex]

  return (
    <section
      aria-labelledby="journey-heading"
      className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Award className="mt-0.5 size-10 shrink-0 text-gold" strokeWidth={1.75} aria-hidden />
          <div>
            <h2 id="journey-heading" className="text-balance text-xl font-bold text-heading sm:text-2xl">
              Your Journey to Becoming a Verified VAAP Member
            </h2>
            <p className="mt-1 text-pretty text-sm leading-relaxed text-body">
              Become a verified VAAP member in four simple steps. Complete your profile, apply for membership, make
              your payment, and receive official approval.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 self-start rounded-full bg-mint px-4 py-1.5 text-sm font-semibold text-green">
          {completedCount} of {steps.length} steps completed
        </span>
      </div>

      <ol className="mt-8 grid grid-cols-2 gap-y-8 md:grid-cols-4">
        {steps.map((step, i) => {
          const status = statusOf(i)
          const Icon = step.icon
          const isLast = i === steps.length - 1
          return (
            <li key={step.title} className="relative flex flex-col items-center text-center">
              {!isLast && (
                <span aria-hidden className="absolute left-1/2 top-7 hidden h-1 w-full -translate-y-1/2 bg-line md:block">
                  <span
                    className={cn(
                      "block h-full bg-green transition-all",
                      status === "completed" ? (statusOf(i + 1) === "completed" ? "w-full" : "w-1/2") : "w-0",
                    )}
                  />
                </span>
              )}
              <span
                className={cn(
                  "relative z-10 flex size-14 items-center justify-center rounded-full border-2",
                  status === "completed"
                    ? "border-green bg-green text-primary-foreground"
                    : "border-line bg-card text-heading",
                )}
              >
                {status === "completed" ? (
                  <Check className="size-6" strokeWidth={3} aria-hidden />
                ) : (
                  <Icon className="size-6" aria-hidden />
                )}
              </span>
              <p className="mt-3 text-pretty px-2 text-sm font-bold text-heading sm:text-base">
                {i + 1}. {step.title}
              </p>
              <StatusPill status={status} />
            </li>
          )
        })}
      </ol>

      {action && (
        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-green-border bg-mint/50 px-4 py-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
            <p className="flex shrink-0 items-center gap-2 text-base font-bold text-heading">
              <Info className="size-5 text-green" aria-hidden />
              Next Action: {action.title}
            </p>
            <span aria-hidden className="hidden h-6 w-px bg-green/40 lg:block" />
            <p className="text-pretty text-sm leading-relaxed text-body">{action.description}</p>
          </div>
          {action.cta && (
            <Link
              href={action.cta.href}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-green-hover"
            >
              {action.cta.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      )}
    </section>
  )
}

function StatusPill({ status }: { status: StepStatus }) {
  if (status === "completed") {
    return (
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-xs font-semibold text-green">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
        Completed
      </span>
    )
  }
  if (status === "next") {
    return (
      <span className="mt-2 inline-flex rounded-full bg-gold-tint px-3 py-1 text-xs font-semibold text-heading">
        Next Step
      </span>
    )
  }
  return (
    <span className="mt-2 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-body">Pending</span>
  )
}
