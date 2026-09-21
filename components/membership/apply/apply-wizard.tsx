"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Bitcoin,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FilePlus2,
  FileText,
  Globe,
  GraduationCap,
  KeyRound,
  Landmark,
  Lock,
  Mail,
  Pencil,
  Rocket,
  Settings,
  ShieldCheck,
  Star,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"
import {
  submitFullApplication,
  saveIncompleteApplication,
  getCryptoRates,
  type CryptoRates,
} from "@/app/actions/public"

const ICONS: Record<string, LucideIcon> = {
  Building2,
  Users,
  Rocket,
  ShieldCheck,
  User,
  GraduationCap,
  Landmark,
}

function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Building2
}

// Highlight bullets per category. Keyed by the stored icon so it stays stable
// even if a plan's title is edited in the CMS.
const PLAN_FEATURES: Record<string, string[]> = {
  Building2: ["Industry representation", "Policy engagement", "Expanded networking"],
  Users: ["Ecosystem participation", "Access to events", "Collaborative opportunities"],
  Rocket: ["Visibility and exposure", "Mentorship opportunities", "Access to investors & partners"],
  ShieldCheck: ["Verified security & trust status", "Priority holder support", "Community & educational resources"],
  User: ["Professional recognition", "Knowledge sharing", "Event access"],
  GraduationCap: ["Research collaboration", "Industry insights access", "Academic engagement"],
  Landmark: ["Research collaboration", "Industry insights access", "Academic engagement"],
}

function featuresFor(icon: string): string[] {
  return PLAN_FEATURES[icon] ?? []
}

export type ApplyPlan = {
  id: number
  icon: string
  title: string
  subtitle: string
  description: string
  admissionFee: string
  admissionFeeNote: string
  annualFee: string
  annualFeeNote: string
  term: string
  benefits: string[]
  eligibility: string[]
}

const STEPS = ["Select Membership", "Information", "Payment", "Review", "Complete"] as const

const INDUSTRY_SECTORS = [
  "Blockchain / Fintech",
  "Cryptocurrency Exchange",
  "Wallet Provider",
  "Payments & Remittance",
  "Legal & Compliance",
  "Consulting & Advisory",
  "Education & Research",
  "Media & Content",
  "Government & Public Sector",
  "Other",
]

// Individual-oriented plans collect a person's profile rather than a company's.
function isIndividualPlan(plan: ApplyPlan): boolean {
  return ["User", "ShieldCheck", "GraduationCap"].includes(plan.icon)
}

function feeToNumber(value: string): number {
  const digits = (value ?? "").replace(/[^\d]/g, "")
  return digits ? Number.parseInt(digits, 10) : 0
}

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-US")}`
}

function totalNumberForPlan(plan: ApplyPlan): number {
  return feeToNumber(plan.admissionFee) + feeToNumber(plan.annualFee)
}

function totalForPlan(plan: ApplyPlan): string {
  const sum = totalNumberForPlan(plan)
  if (sum > 0) return formatPKR(sum)
  // Fall back to the annual label for zero-fee plans (e.g. "Complimentary").
  return plan.annualFee || "No fee"
}

function formatCrypto(amount: number, currency: "USD" | "XRP"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} XRP`
}

type FormState = {
  planId: number | null
  companyName: string
  registrationNumber: string
  website: string
  industrySector: string
  fullName: string
  designation: string
  email: string
  phone: string
  cnic: string
  paymentMethod: "card" | "crypto"
  cardNumber: string
  cardName: string
  cardExpiry: string
  cardCvv: string
  txid: string
  agree: boolean
}

const INITIAL: FormState = {
  planId: null,
  companyName: "",
  registrationNumber: "",
  website: "",
  industrySector: "",
  fullName: "",
  designation: "",
  email: "",
  phone: "",
  cnic: "",
  paymentMethod: "card",
  cardNumber: "",
  cardName: "",
  cardExpiry: "",
  cardCvv: "",
  txid: "",
  agree: false,
}

export function ApplyWizard({
  plans,
  initialPlanId,
}: {
  plans: ApplyPlan[]
  initialPlanId?: number | null
}) {
  // When arriving with a preselected membership type (e.g. chosen on the
  // dashboard), skip the "Select Membership" step and land on Information.
  const preselected = initialPlanId != null && plans.some((p) => p.id === initialPlanId) ? initialPlanId : null
  const [step, setStep] = useState(preselected ? 1 : 0)
  const [form, setForm] = useState<FormState>(preselected ? { ...INITIAL, planId: preselected } : INITIAL)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reference, setReference] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<number | null>(null)
  const [account, setAccount] = useState<{ created: boolean; tempPassword?: string } | null>(null)

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === form.planId) ?? null,
    [plans, form.planId],
  )
  const individual = selectedPlan ? isIndividualPlan(selectedPlan) : false

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validateStep(current: number): string | null {
    if (current === 0 && !selectedPlan) return "Please select a membership type to continue."
    if (current === 1) {
      if (!individual && !form.companyName.trim()) return "Please enter your company name."
      if (!form.fullName.trim()) return "Please enter your full name."
      if (!form.email.trim()) return "Please enter your email address."
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please enter a valid email address."
      if (!form.phone.trim()) return "Please enter your phone number."
      if (!form.cnic.trim()) return "Please enter your CNIC / NIC number."
    }
    if (current === 2 && form.paymentMethod === "card") {
      if (!form.cardNumber.trim() || !form.cardName.trim() || !form.cardExpiry.trim() || !form.cardCvv.trim())
        return "Please complete your card details, or choose Crypto Payment."
    }
    if (current === 2 && form.paymentMethod === "crypto") {
      if (!form.txid.trim())
        return "Please enter your crypto Transaction ID (TXID) to continue."
    }
    if (current === 3 && !form.agree) return "Please confirm the information is correct to submit."
    return null
  }

  async function goNext() {
    const validationError = validateStep(step)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)

    // Leaving the Information step: persist an incomplete application so the
    // admin team can follow up if the applicant abandons the payment stage.
    if (step === 1 && selectedPlan) {
      const res = await saveIncompleteApplication({
        applicationId,
        category: selectedPlan.title,
        name: form.fullName,
        email: form.email,
        organization: individual ? "" : form.companyName,
        registrationNumber: form.registrationNumber,
        website: form.website,
        industrySector: form.industrySector,
        designation: form.designation,
        phone: form.phone ? `+92 ${form.phone}`.trim() : "",
        cnic: form.cnic,
        admissionFee: selectedPlan.admissionFee,
        annualFee: selectedPlan.annualFee,
        totalAmount: totalForPlan(selectedPlan),
      })
      if (res.ok && res.applicationId) setApplicationId(res.applicationId)
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goBack() {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleSubmit() {
    const validationError = validateStep(3)
    if (validationError) {
      setError(validationError)
      return
    }
    if (!selectedPlan) return
    setSubmitting(true)
    setError(null)
    const result = await submitFullApplication({
      applicationId,
      category: selectedPlan.title,
      name: form.fullName,
      email: form.email,
      organization: individual ? "" : form.companyName,
      registrationNumber: form.registrationNumber,
      website: form.website,
      industrySector: form.industrySector,
      designation: form.designation,
      phone: form.phone ? `+92 ${form.phone}`.trim() : "",
      cnic: form.cnic,
      paymentMethod: form.paymentMethod,
      txid: form.paymentMethod === "crypto" ? form.txid : "",
      admissionFee: selectedPlan.admissionFee,
      annualFee: selectedPlan.annualFee,
      totalAmount: totalForPlan(selectedPlan),
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setReference(result.reference)
    setAccount(result.account ?? null)
    setStep(4)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="border-b border-line px-5 py-6 lg:px-10">
        <Stepper step={step} />
      </div>

      <div className="px-5 py-8 lg:px-10 lg:py-10">
        {error && (
          <p className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        {step === 0 && (
          <StepSelectType plans={plans} selectedId={form.planId} onSelect={(id) => update("planId", id)} />
        )}

        {step === 1 && selectedPlan && (
          <StepInformation plan={selectedPlan} individual={individual} form={form} update={update} />
        )}

        {step === 2 && selectedPlan && (
          <StepPayment plan={selectedPlan} form={form} update={update} />
        )}

        {step === 3 && selectedPlan && (
          <StepReview
            plan={selectedPlan}
            individual={individual}
            form={form}
            onEdit={setStep}
            onAgreeChange={(checked) => update("agree", checked)}
          />
        )}

        {step === 4 && selectedPlan && (
          <StepComplete plan={selectedPlan} email={form.email} reference={reference} account={account} />
        )}

        {step < 4 && (
          <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-5 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
              >
                {step === 1 ? "Continue to Payment" : step === 2 ? "Pay and Continue" : "Continue"}
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit Application"}
                <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center">
      {STEPS.map((label, i) => {
        const done = i < step
        const current = i === step
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={[
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                  done || current ? "bg-green text-white" : "bg-muted text-muted-2",
                ].join(" ")}
                aria-current={current ? "step" : undefined}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={[
                  "hidden whitespace-nowrap text-[11px] font-semibold sm:block",
                  done || current ? "text-heading" : "text-muted-2",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={["mx-2 h-px flex-1 transition-colors sm:mx-3", i < step ? "bg-green" : "bg-line"].join(" ")}
                aria-hidden
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-serif text-2xl font-bold text-heading lg:text-3xl">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-2">{description}</p>
    </div>
  )
}

// Flagship plans (Corporate + the two Verified memberships) carry a gold badge.
function isFeaturedPlan(icon: string): boolean {
  return ["Building2", "ShieldCheck"].includes(icon)
}

// Associate Membership is positioned for international companies and projects.
function isInternationalPlan(title: string): boolean {
  return title.toLowerCase().includes("associate")
}

const ELIGIBILITY_ICONS: LucideIcon[] = [Settings, FileText, ShieldCheck, User]

function StepSelectType({
  plans,
  selectedId,
  onSelect,
}: {
  plans: ApplyPlan[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  // Which plan's detail is shown. Browsing and choosing are the same action:
  // clicking a plan both reveals its detail and selects it for the application.
  const [viewId, setViewId] = useState<number>(selectedId ?? plans[0]?.id ?? 0)
  const viewed = plans.find((p) => p.id === viewId) ?? plans[0] ?? null

  function choose(id: number) {
    setViewId(id)
    onSelect(id)
  }

  return (
    <div>
      <div className="mb-8">
        <p className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-green">
          <span className="h-px w-7 bg-gold" aria-hidden />
          Join Our Ecosystem
        </p>
        <h1 className="mt-3 font-serif text-2xl font-bold text-heading lg:text-3xl">Select Membership Type</h1>
        <p className="mt-1.5 text-sm text-muted-2">Choose the category that best describes you or your organization.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Plan list */}
        <div className="flex flex-col gap-2.5" role="tablist" aria-label="Membership types">
          {plans.map((plan) => {
            const Icon = iconFor(plan.icon)
            const isViewing = plan.id === viewId
            const isSelected = plan.id === selectedId
            const featured = isFeaturedPlan(plan.icon)
            return (
              <button
                type="button"
                key={plan.id}
                role="tab"
                aria-selected={isViewing}
                onClick={() => choose(plan.id)}
                className={[
                  "group relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                  isViewing
                    ? "border-green bg-green text-white shadow-md"
                    : featured
                      ? "border-gold/40 bg-card text-heading hover:border-green/50 hover:bg-mint/40"
                      : "border-line bg-card text-heading hover:border-green/50 hover:bg-mint/40",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                    isViewing ? "bg-white/15 text-white" : "bg-mint text-green group-hover:bg-white",
                  ].join(" ")}
                >
                  <Icon className="size-5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug tracking-tight">{plan.title}</span>
                  {featured && (
                    <span
                      className={[
                        "mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        isViewing ? "border-white/40 text-white/90" : "border-gold/50 text-gold",
                      ].join(" ")}
                    >
                      <Star className="size-2.5 fill-current" aria-hidden />
                      Featured
                    </span>
                  )}
                  {isInternationalPlan(plan.title) && (
                    <span
                      className={[
                        "mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        isViewing ? "border-white/40 text-white/90" : "border-green/40 text-green",
                      ].join(" ")}
                    >
                      <Globe className="size-2.5" aria-hidden />
                      International
                    </span>
                  )}
                </span>
                {isSelected && !isViewing ? (
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green text-white"
                    aria-hidden
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                ) : (
                  <ChevronRight
                    className={["size-4 shrink-0", isViewing ? "text-white" : "text-muted-2"].join(" ")}
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Detail panel */}
        {viewed && (
          <div className="rounded-2xl border border-line bg-card p-6 lg:p-8">
            <PlanDetailPanel plan={viewed} selected={viewed.id === selectedId} onChoose={() => choose(viewed.id)} />
          </div>
        )}
      </div>
    </div>
  )
}

function PlanDetailPanel({
  plan,
  selected,
  onChoose,
}: {
  plan: ApplyPlan
  selected: boolean
  onChoose: () => void
}) {
  const Icon = iconFor(plan.icon)
  const benefits = plan.benefits.length > 0 ? plan.benefits : featuresFor(plan.icon)

  const fees: { label: string; value: string; note?: string; icon: LucideIcon }[] = []
  if (plan.annualFee)
    fees.push({ label: "Annual Fee", value: plan.annualFee, note: plan.annualFeeNote || undefined, icon: CalendarDays })
  if (plan.admissionFee)
    fees.push({
      label: "Admission Fee (One-time)",
      value: plan.admissionFee,
      note: plan.admissionFeeNote || undefined,
      icon: FilePlus2,
    })
  if (plan.term) fees.push({ label: "Membership Term", value: plan.term, icon: CalendarClock })

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green">{plan.title}</p>
            <span className="hidden h-px w-10 bg-green/40 sm:block" aria-hidden />
          </div>
          <h2 className="mt-3 font-serif text-2xl font-bold leading-tight text-heading xl:text-3xl">{plan.subtitle}</h2>
          {isInternationalPlan(plan.title) && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-green/30 bg-mint/50 px-3 py-1 text-xs font-semibold text-green">
              <Globe className="size-3.5" aria-hidden />
              Recommended for international companies & projects
            </span>
          )}
        </div>
        <span className="hidden size-14 shrink-0 items-center justify-center rounded-full bg-mint text-green sm:flex">
          <Icon className="size-7" aria-hidden />
        </span>
      </div>

      {plan.description && <p className="mt-5 leading-relaxed text-body">{plan.description}</p>}

      {fees.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {fees.map((fee) => {
            const FeeIcon = fee.icon
            return (
              <div key={fee.label} className="flex items-center gap-3 rounded-xl border border-line bg-muted/40 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-mint text-green">
                  <FeeIcon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium leading-tight text-body">{fee.label}</p>
                  <p className="font-serif text-lg font-bold leading-tight text-heading">{fee.value}</p>
                  {fee.note && <p className="text-[11px] leading-tight text-muted-2">({fee.note})</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {benefits.length > 0 && (
          <div>
            <h3 className="font-serif text-xl font-bold text-green">Key Benefits</h3>
            <ul className="mt-4 space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-sm leading-relaxed text-body">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green text-white">
                    <Check className="size-3" aria-hidden />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {plan.eligibility.length > 0 && (
          <div className="md:border-l md:border-line md:pl-8">
            <h3 className="font-serif text-xl font-bold text-green">Eligibility Criteria</h3>
            <ul className="mt-4 space-y-4">
              {plan.eligibility.map((text, i) => {
                const EligIcon = ELIGIBILITY_ICONS[i % ELIGIBILITY_ICONS.length]
                return (
                  <li key={text} className="flex items-center gap-3 text-sm leading-relaxed text-body">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-green">
                      <EligIcon className="size-5" aria-hidden />
                    </span>
                    <span>{text}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <button
          type="button"
          onClick={onChoose}
          aria-pressed={selected}
          className={[
            "inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors sm:w-auto",
            selected
              ? "bg-green/10 text-green ring-1 ring-green/30"
              : "bg-green text-white hover:bg-green-hover",
          ].join(" ")}
        >
          {selected ? (
            <>
              <Check className="size-4" strokeWidth={2.5} />
              Selected
            </>
          ) : (
            <>
              Choose this membership
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-heading">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  )
}

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-heading placeholder:text-muted-2/70 outline-none transition-colors focus:border-green focus:ring-2 focus:ring-green/15"

function StepInformation({
  plan,
  individual,
  form,
  update,
}: {
  plan: ApplyPlan
  individual: boolean
  form: FormState
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void
}) {
  const Icon = iconFor(plan.icon)
  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-heading lg:text-3xl">
            {individual ? "Your Information" : "Company Information"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-2">Please provide your basic information.</p>
        </div>
        <span className="hidden shrink-0 items-center gap-2 rounded-lg border border-line bg-muted/50 px-3 py-2 text-sm font-semibold text-heading sm:inline-flex">
          <Icon className="size-4 text-green" />
          {plan.title}
        </span>
      </div>

      {!individual && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Company Name" required>
              <input
                className={INPUT_CLASS}
                placeholder="Enter company name"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
              />
            </Field>
            <Field label="Registration Number (e.g. SECP / NTN)">
              <input
                className={INPUT_CLASS}
                placeholder="e.g. SECP No. / NTN"
                value={form.registrationNumber}
                onChange={(e) => update("registrationNumber", e.target.value)}
              />
            </Field>
            <Field label="Website">
              <input
                className={INPUT_CLASS}
                placeholder="https://"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
              />
            </Field>
            <Field label="Industry Sector" required>
              <div className="relative">
                <select
                  className={`${INPUT_CLASS} appearance-none pr-9`}
                  value={form.industrySector}
                  onChange={(e) => update("industrySector", e.target.value)}
                >
                  <option value="">Select sector</option>
                  {INDUSTRY_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
              </div>
            </Field>
          </div>
          <h2 className="mb-4 mt-8 font-serif text-lg font-bold text-heading">Primary Contact</h2>
        </>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" required>
          <input
            className={INPUT_CLASS}
            placeholder="Enter full name"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
          />
        </Field>
        <Field label="Designation">
          <input
            className={INPUT_CLASS}
            placeholder="e.g. CEO, Director"
            value={form.designation}
            onChange={(e) => update("designation", e.target.value)}
          />
        </Field>
        <Field label="Email Address" required>
          <input
            type="email"
            className={INPUT_CLASS}
            placeholder="name@company.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
        <Field label="Phone Number" required>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg border border-line bg-muted/50 px-3 text-sm font-semibold text-heading">
              +92
            </span>
            <input
              className={INPUT_CLASS}
              placeholder="300 1234567"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
        </Field>
      </div>

      <h2 className="mb-4 mt-8 font-serif text-lg font-bold text-heading">Identification</h2>
      <div className="grid gap-1.5">
        <Field label="CNIC / NIC Number" required>
          <input
            className={INPUT_CLASS}
            placeholder="e.g. 12345-1234567-1"
            value={form.cnic}
            onChange={(e) => update("cnic", e.target.value)}
          />
        </Field>
        <p className="text-xs text-muted-2">Only CNIC/NIC number is required at this stage.</p>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "text-sm font-bold text-heading" : "text-sm text-muted-2"}>{label}</span>
      <span className={strong ? "font-serif text-lg font-bold text-green" : "text-sm font-semibold text-heading"}>
        {value}
      </span>
    </div>
  )
}

// Indicative rate shown instantly while the live rate loads (and if it fails).
const INDICATIVE_RATES: CryptoRates = {
  usdPerPkr: 1 / 280,
  xrpPerPkr: 1 / (280 * 2.5),
  source: "fallback",
}

function CryptoConverter({ plan }: { plan: ApplyPlan }) {
  const [currency, setCurrency] = useState<"XRP" | "USD">("XRP")
  const [rates, setRates] = useState<CryptoRates>(INDICATIVE_RATES)
  const [loading, setLoading] = useState(false)

  async function loadRates() {
    if (loading) return
    setLoading(true)
    try {
      const r = await getCryptoRates()
      setRates(r)
    } catch {
      // keep the indicative rate already on screen
    } finally {
      setLoading(false)
    }
  }

  // Upgrade the indicative rate to a live one when the panel first appears.
  useEffect(() => {
    void loadRates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPkr = totalNumberForPlan(plan)
  const rate = currency === "USD" ? rates.usdPerPkr : rates.xrpPerPkr
  const converted = totalPkr * rate
  const pkrPerUnit = 1 / rate

  return (
    <div className="mt-6 rounded-xl border border-line bg-muted/30 p-5">
      <div className="flex items-center gap-2">
        <Bitcoin className="size-5 text-green" />
        <p className="text-sm font-semibold text-heading">Pay with cryptocurrency</p>
      </div>
      <p className="mt-1 text-xs text-muted-2">
        Convert your total to its live crypto equivalent. After you submit, our team will share a verified wallet
        address and payment instructions by email.
      </p>

      <div className="mt-4 inline-flex rounded-lg border border-line p-1">
        {(["XRP", "USD"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            aria-pressed={currency === c}
            className={[
              "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
              currency === c ? "bg-green text-white" : "text-heading hover:bg-muted",
            ].join(" ")}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-line bg-background p-4">
        <div className="flex items-center justify-between text-xs text-muted-2">
          <span>Total ({plan.title})</span>
          <span className="font-medium text-heading">{formatPKR(totalPkr)}</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
          <span className="text-sm text-muted-2">You pay approx.</span>
          <span className="font-sans text-2xl font-bold tracking-tight text-heading">{formatCrypto(converted, currency)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-2">
          <span>
            {loading
              ? "Updating live rate…"
              : rates.source === "live"
                ? "Live rate · CoinGecko"
                : "Indicative rate"}
            {` · 1 ${currency} ≈ ${formatPKR(Math.round(pkrPerUnit))}`}
          </span>
          <button
            type="button"
            onClick={() => void loadRates()}
            className="font-semibold text-green hover:underline disabled:opacity-50"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <a
        href="https://s.binance.com/NZPNkx59"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green/90"
      >
        <Bitcoin className="size-4" />
        Pay with Binance
      </a>
      <p className="mt-2 text-[11px] text-muted-2">
        Opens Binance Pay in a new tab. Complete your payment there, then return here to submit your application.
      </p>
    </div>
  )
}

function StepPayment({
  plan,
  form,
  update,
}: {
  plan: ApplyPlan
  form: FormState
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void
}) {
  return (
    <div>
      <StepHeading title="Payment Method" description="Choose your preferred payment method." />
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-line p-1">
            <button
              type="button"
              onClick={() => update("paymentMethod", "card")}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors",
                form.paymentMethod === "card" ? "bg-green text-white" : "text-heading hover:bg-muted",
              ].join(" ")}
            >
              <CreditCard className="size-4" />
              Credit / Debit Card
            </button>
            <button
              type="button"
              onClick={() => update("paymentMethod", "crypto")}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors",
                form.paymentMethod === "crypto" ? "bg-green text-white" : "text-heading hover:bg-muted",
              ].join(" ")}
            >
              <Bitcoin className="size-4" />
              Crypto Payment
            </button>
          </div>

          {form.paymentMethod === "card" ? (
            <div className="mt-6 grid gap-5">
              <Field label="Card Number" required>
                <input
                  inputMode="numeric"
                  className={INPUT_CLASS}
                  placeholder="1234 5678 9012 3456"
                  value={form.cardNumber}
                  onChange={(e) => update("cardNumber", e.target.value)}
                />
              </Field>
              <Field label="Cardholder Name" required>
                <input
                  className={INPUT_CLASS}
                  placeholder="Enter name on card"
                  value={form.cardName}
                  onChange={(e) => update("cardName", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Expiry Date" required>
                  <input
                    className={INPUT_CLASS}
                    placeholder="MM / YY"
                    value={form.cardExpiry}
                    onChange={(e) => update("cardExpiry", e.target.value)}
                  />
                </Field>
                <Field label="CVV" required>
                  <input
                    inputMode="numeric"
                    className={INPUT_CLASS}
                    placeholder="123"
                    value={form.cardCvv}
                    onChange={(e) => update("cardCvv", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          ) : (
            <>
              <CryptoConverter plan={plan} />
              <div className="mt-6">
                <Field label="Transaction ID (TXID / Hash)" required>
                  <input
                    className={INPUT_CLASS}
                    placeholder="e.g. 0x4f3c… or the hash from your wallet"
                    value={form.txid}
                    onChange={(e) => update("txid", e.target.value)}
                  />
                </Field>
                <p className="mt-1.5 text-xs text-muted-2">
                  After completing your crypto payment, paste the transaction ID (TXID) here so our team can verify it.
                  This is required before you can continue.
                </p>
              </div>
            </>
          )}

          <div className="mt-6 flex items-start gap-2 text-xs text-muted-2">
            <Lock className="mt-0.5 size-4 shrink-0 text-green" />
            <p>
              <span className="font-semibold text-heading">Secure Payment.</span> Your payment information is encrypted
              and never stored on our servers.
            </p>
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-line bg-muted/30 p-5">
          <h2 className="font-serif text-base font-bold text-heading">Order Summary</h2>
          <p className="mt-1 text-sm font-semibold text-green">{plan.title}</p>
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
            <SummaryRow label="Admission Fee (one-time)" value={plan.admissionFee || "—"} />
            <SummaryRow label="Annual Fee" value={plan.annualFee || "—"} />
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <SummaryRow label="Total Amount" value={totalForPlan(plan)} strong />
          </div>
        </aside>
      </div>
    </div>
  )
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-2">{title}</h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-xs font-semibold text-green hover:underline"
          >
            <Pencil className="size-3" />
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1 text-sm">
      <span className="text-muted-2">{label}</span>
      <span className="font-medium text-heading">{value}</span>
    </div>
  )
}

function StepReview({
  plan,
  individual,
  form,
  onEdit,
  onAgreeChange,
}: {
  plan: ApplyPlan
  individual: boolean
  form: FormState
  onEdit: (step: number) => void
  onAgreeChange: (checked: boolean) => void
}) {
  const Icon = iconFor(plan.icon)
  return (
    <div>
      <StepHeading title="Review Your Application" description="Please review your information before submitting." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-line p-5">
          <ReviewSection title="Membership Type" onEdit={() => onEdit(0)}>
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-green">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-heading">{plan.title}</p>
                <p className="text-xs text-muted-2">{plan.subtitle}</p>
              </div>
            </div>
          </ReviewSection>

          {!individual && (
            <ReviewSection title="Company Information" onEdit={() => onEdit(1)}>
              <ReviewRow label="Company Name" value={form.companyName} />
              <ReviewRow label="Registration Number" value={form.registrationNumber} />
              <ReviewRow label="Website" value={form.website} />
              <ReviewRow label="Industry Sector" value={form.industrySector} />
            </ReviewSection>
          )}

          <ReviewSection title={individual ? "Applicant" : "Primary Contact"} onEdit={() => onEdit(1)}>
            <ReviewRow label="Full Name" value={form.fullName} />
            <ReviewRow label="Designation" value={form.designation} />
            <ReviewRow label="Email Address" value={form.email} />
            <ReviewRow label="Phone Number" value={form.phone ? `+92 ${form.phone}` : ""} />
          </ReviewSection>

          <ReviewSection title="Identification" onEdit={() => onEdit(1)}>
            <ReviewRow label="CNIC / NIC Number" value={form.cnic} />
          </ReviewSection>
        </div>

        <div className="h-fit rounded-xl border border-line bg-muted/30 p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-2">Payment Details</h3>
          <div className="mt-3 flex flex-col gap-3">
            <SummaryRow label="Payment Method" value={form.paymentMethod === "card" ? "Credit / Debit Card" : "Crypto Payment"} />
            {form.paymentMethod === "crypto" && form.txid.trim() && (
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-2">Transaction ID</span>
                <span className="break-all font-mono text-xs font-medium text-heading">{form.txid.trim()}</span>
              </div>
            )}
            <SummaryRow label="Admission Fee (one-time)" value={plan.admissionFee || "—"} />
            <SummaryRow label="Annual Fee" value={plan.annualFee || "—"} />
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <SummaryRow label="Total Amount" value={totalForPlan(plan)} strong />
          </div>
        </div>
      </div>

      <label className="mt-6 flex items-start gap-3 rounded-lg border border-line bg-muted/30 p-4">
        <input
          type="checkbox"
          checked={form.agree}
          onChange={(e) => onAgreeChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-green)]"
        />
        <span className="text-sm text-body">
          I confirm that all information provided is correct and I agree to the VAAP{" "}
          <Link href="/membership" className="font-semibold text-green hover:underline">
            Membership Terms and Conditions
          </Link>
          .
        </span>
      </label>
    </div>
  )
}

function StepComplete({
  plan,
  email,
  reference,
  account,
  }: {
  plan: ApplyPlan
  email: string
  reference: string | null
  account: { created: boolean; tempPassword?: string } | null
  }) {
  return (
  <div className="mx-auto max-w-2xl text-center">
  <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green/10">
  <Check className="size-8 text-green" strokeWidth={2.5} />
  </span>
  <h1 className="mt-6 font-serif text-2xl font-bold text-heading lg:text-3xl">Application Submitted Successfully!</h1>
  <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-body">
  Thank you for applying for VAAP {plan.title}. Your application has been received and is now under review. You
  will receive a confirmation email shortly.
  </p>

  {account?.created && account.tempPassword && (
  <div className="mx-auto mt-8 max-w-lg rounded-xl border border-green/30 bg-green/5 p-5 text-left">
  <div className="flex items-center gap-2">
  <KeyRound className="size-4 text-green" />
  <p className="text-sm font-bold text-heading">Your member account is ready</p>
  </div>
  <p className="mt-2 text-xs leading-relaxed text-body">
  We&apos;ve created a member login for you so you can sign in and access your dashboard right away. Please
  save these credentials and change your password after your first sign-in.
  </p>
  <dl className="mt-4 space-y-2 rounded-lg border border-line bg-card p-3 text-xs">
  <div className="flex items-center justify-between gap-3">
  <dt className="text-muted-2">Email</dt>
  <dd className="break-all font-mono font-medium text-heading">{email}</dd>
  </div>
  <div className="flex items-center justify-between gap-3">
  <dt className="text-muted-2">Temporary password</dt>
  <dd className="break-all font-mono font-semibold text-green">{account.tempPassword}</dd>
  </div>
  </dl>
  </div>
  )}
  {account && !account.created && (
  <p className="mx-auto mt-6 max-w-lg text-xs leading-relaxed text-muted-2">
  An account already exists for {email || "this email"}. You can sign in with your existing credentials to
  track your application.
  </p>
  )}
  
      <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-muted/30 p-4">
          <Mail className="size-5 text-green" />
          <p className="mt-2 text-sm font-bold text-heading">Confirmation Email</p>
          <p className="mt-1 text-xs text-muted-2">A confirmation email has been sent to {email || "your inbox"}.</p>
        </div>
        <div className="rounded-xl border border-line bg-muted/30 p-4">
          <FileText className="size-5 text-green" />
          <p className="mt-2 text-sm font-bold text-heading">Application Reference</p>
          <p className="mt-1 text-xs font-semibold text-green">{reference ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-line bg-muted/30 p-4">
          <Clock className="size-5 text-green" />
          <p className="mt-2 text-sm font-bold text-heading">Review Timeline</p>
          <p className="mt-1 text-xs text-muted-2">Your application will be reviewed within 5–10 business days.</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover"
        >
          Go to Homepage
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/dashboard/applications"
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-6 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-muted"
        >
          Track My Application
        </Link>
      </div>

      <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-2">
        A Stronger Digital Pakistan
      </p>
    </div>
  )
}
