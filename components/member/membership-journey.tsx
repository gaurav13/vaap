import Link from "next/link"
import { ArrowRight, Check, CreditCard, FileText, ShieldCheck, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

type StepStatus = "completed" | "next" | "pending"

type Step = {
  title: string
  description: string
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
    { title: "Complete profile", description: "Contact and professional details", icon: UserRound, done: profileComplete },
    { title: "Apply for membership", description: "Choose your membership category", icon: FileText, done: applied },
    { title: "Pay membership fee", description: "Submit application for review", icon: CreditCard, done: paid },
    { title: "Verification", description: "Approval by the VAAP team", icon: ShieldCheck, done: verified },
  ]
  const nextIndex = steps.findIndex((s) => !s.done)
  const completedCount = steps.filter((s) => s.done).length
  const progress = Math.round((completedCount / steps.length) * 100)
  const statusOf = (i: number): StepStatus =>
    steps[i].done ? "completed" : i === nextIndex ? "next" : "pending"

  const nextActions: NextAction[] = [
    {
      title: "Complete your profile",
      description: "Add your phone, city and professional details so we can process your membership.",
      cta: { label: "Complete profile", href: "/dashboard/profile" },
    },
    {
      title: "Apply for membership",
      description: "Your profile is complete. Apply for a VAAP membership to proceed to payment.",
      cta: { label: "Start application", href: "/dashboard/membership" },
    },
    {
      title: "Pay the membership fee",
      description: "Your application is saved. Pay the membership fee to send it for review.",
      cta: { label: "Pay fee", href: "/dashboard/membership" },
    },
    {
      title: "Awaiting approval",
      description: "Payment received. Our team is reviewing your application and will notify you once approved.",
    },
  ]
  const action = nextIndex === -1 ? null : nextActions[nextIndex]

  return (
    <section aria-labelledby="journey-heading" className="rounded-xl border border-line bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-line px-5 py-5 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-green">Membership onboarding</p>
          <h2 id="journey-heading" className="mt-1 text-balance text-lg font-semibold text-heading sm:text-xl">
            Become a verified VAAP member
          </h2>
          <p className="mt-1 max-w-2xl text-pretty text-sm leading-relaxed text-body">
            Complete the steps below to activate your membership and receive your Member ID.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 md:w-56">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-2">Progress</span>
            <span className="font-semibold tabular-nums text-heading">
              {completedCount} of {steps.length} complete
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Membership onboarding progress"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-green transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <ol className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => {
          const status = statusOf(i)
          const Icon = step.icon
          return (
            <li
              key={step.title}
              aria-current={status === "next" ? "step" : undefined}
              className={cn(
                "relative flex gap-3 bg-card px-5 py-5 sm:px-6",
                status === "next" && "bg-mint/40",
              )}
            >
              {status === "next" && <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-green" />}
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  status === "completed" && "border-green bg-green text-primary-foreground",
                  status === "next" && "border-green bg-card text-green",
                  status === "pending" && "border-line bg-card text-muted-2",
                )}
              >
                {status === "completed" ? (
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                ) : (
                  <Icon className="size-4" aria-hidden />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-2">Step {i + 1}</p>
                <p className="mt-0.5 text-sm font-semibold text-heading">{step.title}</p>
                <p className="mt-0.5 text-pretty text-xs leading-relaxed text-muted-2">{step.description}</p>
                <StatusLabel status={status} />
              </div>
            </li>
          )
        })}
      </ol>

      {action && (
        <div className="flex flex-col gap-4 border-t border-line px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-heading">Next: {action.title}</p>
            <p className="mt-0.5 text-pretty text-sm leading-relaxed text-body">{action.description}</p>
          </div>
          {action.cta && (
            <Link
              href={action.cta.href}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-green px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-green-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2"
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

function StatusLabel({ status }: { status: StepStatus }) {
  const config = {
    completed: { label: "Completed", dot: "bg-green", text: "text-green" },
    next: { label: "In progress", dot: "bg-green", text: "text-green" },
    pending: { label: "Not started", dot: "bg-muted-2/50", text: "text-muted-2" },
  }[status]
  return (
    <span className={cn("mt-2 inline-flex items-center gap-1.5 text-xs font-medium", config.text)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  )
}
