"use client"

import { useActionState, useState } from "react"
import { Award, Briefcase, CheckCircle2, Loader2, Users } from "lucide-react"
import { submitLeadershipApplication } from "@/app/actions/leadership"
import { APPLICATION_KINDS, EXPERTISE_AREAS, LEADERSHIP_COMMITMENTS, MEMBERSHIP_INTENTS } from "@/lib/leadership"
import { PhotoUpload } from "@/components/leadership/photo-upload"

const input =
  "w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-heading placeholder:text-muted-2 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
const label = "text-sm font-medium text-heading"
const TOTAL_STEPS = 6

const KIND_DETAILS: Record<string, { icon: typeof Users; description: string }> = {
  "Executive Committee": { icon: Users, description: "Lead VAAP strategy, operations and governance." },
  "Advisory Committee Members": { icon: Award, description: "Guide policy, regulation and industry direction." },
  "Industry Advisor Members": { icon: Briefcase, description: "Share sector expertise on focused initiatives." },
}

function Field({
  id,
  title,
  hint,
  optional,
  children,
}: {
  id: string
  title: string
  hint?: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={label}>
        {title}
        {optional ? (
          <span className="ml-1.5 font-normal text-muted-2">(optional)</span>
        ) : (
          <span className="ml-0.5 text-green" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted-2">{hint}</p>}
    </div>
  )
}

function Section({
  step,
  title,
  description,
  children,
}: {
  step: number
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="overflow-hidden rounded-xl border border-line bg-card">
      <legend className="sr-only">{title}</legend>
      <div className="flex flex-col gap-1 border-b border-line bg-surface px-6 py-4 md:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-green">
          Step {step} of {TOTAL_STEPS}
        </p>
        <h2 className="font-serif text-lg font-semibold text-heading">{title}</h2>
        {description && <p className="text-sm leading-relaxed text-muted-2">{description}</p>}
      </div>
      <div className="flex flex-col gap-5 px-6 py-6 md:px-8">{children}</div>
    </fieldset>
  )
}

export function LeadershipApplicationForm({ defaultEmail, defaultName }: { defaultEmail: string; defaultName: string }) {
  const [state, action, pending] = useActionState(submitLeadershipApplication, null)
  const [uploading, setUploading] = useState(false)

  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-card p-6 shadow-sm md:p-8">
        <span className="flex size-11 items-center justify-center rounded-full bg-mint text-green">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <h2 className="font-serif text-2xl font-semibold text-heading">Application submitted</h2>
        <p className="leading-relaxed text-muted-2">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <Section step={1} title="Position" description="Choose the leadership group you would like to join.">
        <div role="radiogroup" aria-label="Applying for" className="grid gap-3 sm:grid-cols-3">
          {APPLICATION_KINDS.map((k, i) => {
            const detail = KIND_DETAILS[k.value]
            const Icon = detail?.icon ?? Users
            return (
              <label
                key={k.value}
                className="group relative flex cursor-pointer flex-col gap-2 rounded-xl border border-line bg-card p-4 transition-colors hover:border-green/60 has-[:checked]:border-green has-[:checked]:bg-mint-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green/30"
              >
                <input type="radio" name="kind" value={k.value} required={i === 0} className="peer sr-only" />
                <span className="flex size-9 items-center justify-center rounded-lg bg-mint text-green">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-heading">{k.label}</span>
                {detail && <span className="text-xs leading-relaxed text-muted-2">{detail.description}</span>}
                <CheckCircle2
                  className="absolute right-3 top-3 size-5 text-green opacity-0 transition-opacity peer-checked:opacity-100"
                  aria-hidden="true"
                />
              </label>
            )
          })}
        </div>
        <Field id="portfolio" title="Proposed portfolio / area of contribution" hint="e.g. Regulatory affairs, Web3 education, Exchange compliance">
          <input id="portfolio" name="portfolio" required maxLength={600} className={input} />
        </Field>
      </Section>

      <Section step={2} title="Professional details" description="How you will appear on your public profile.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="name" title="Full name">
            <input id="name" name="name" required maxLength={120} defaultValue={defaultName} autoComplete="name" className={input} />
          </Field>
          <Field id="title" title="Professional title">
            <input id="title" name="title" required maxLength={160} placeholder="Chief Executive Officer" className={input} />
          </Field>
          <Field id="organization" title="Organization">
            <input id="organization" name="organization" required maxLength={160} autoComplete="organization" className={input} />
          </Field>
          <Field id="position" title="Current role at organization" optional>
            <input id="position" name="position" maxLength={120} className={input} />
          </Field>
          <Field id="yearsExperience" title="Years of relevant industry experience">
            <input id="yearsExperience" name="yearsExperience" type="number" inputMode="numeric" required min={0} max={60} step={1} className={input} />
          </Field>
          <Field id="expertise" title="Primary area of professional expertise">
            <select id="expertise" name="expertise" required defaultValue="" className={input}>
              <option value="" disabled>
                Select an area
              </option>
              {EXPERTISE_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={label}>Profile photograph</span>
          <PhotoUpload name="photo" onBusyChange={setUploading} />
        </div>
      </Section>

      <Section step={3} title="About you" description="Plain facts are best — our editors will polish the final wording with you.">
        <Field id="bio" title="Biography" hint="Your career, expertise and achievements. Minimum 80 characters.">
          <textarea id="bio" name="bio" required minLength={80} maxLength={8000} rows={7} className={`${input} leading-relaxed`} />
        </Field>
        <Field id="responsibility" title="Key experience & responsibilities" optional>
          <textarea id="responsibility" name="responsibility" maxLength={600} rows={3} className={`${input} leading-relaxed`} />
        </Field>
        <Field id="message" title="Why do you want to serve VAAP?" optional>
          <textarea id="message" name="message" maxLength={3000} rows={4} className={`${input} leading-relaxed`} />
        </Field>
      </Section>

      <Section step={4} title="Public links" description="All optional. These are shown on your published profile.">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["linkedin", "LinkedIn URL"],
            ["x", "X (Twitter) URL"],
            ["website", "Website"],
            ["facebook", "Facebook URL"],
            ["instagram", "Instagram URL"],
          ].map(([id, title]) => (
            <Field key={id} id={id} title={title} optional>
              <input id={id} name={id} type="url" maxLength={2048} placeholder="https://" className={input} />
            </Field>
          ))}
          <Field id="email" title="Public email" optional>
            <input id="email" name="email" type="email" maxLength={200} className={input} />
          </Field>
        </div>
      </Section>

      <Section step={5} title="Private contact" description="Only the VAAP review team sees these.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="contactEmail" title="Contact email">
            <input id="contactEmail" name="contactEmail" type="email" required defaultValue={defaultEmail} className={input} />
          </Field>
          <Field id="contactPhone" title="Phone / WhatsApp" optional>
            <input id="contactPhone" name="contactPhone" type="tel" maxLength={40} autoComplete="tel" className={input} />
          </Field>
        </div>
      </Section>

      <Section
        step={6}
        title="Are you currently a VAAP member?"
        description="Non-members can apply. No payment is needed before the initial review."
      >
        <div role="radiogroup" aria-label="VAAP membership" className="grid gap-3 sm:grid-cols-2">
          {MEMBERSHIP_INTENTS.map((m, i) => (
            <label
              key={m.value}
              className="relative flex cursor-pointer flex-col gap-1 rounded-xl border border-line bg-card p-4 pr-10 transition-colors hover:border-green/60 has-[:checked]:border-green has-[:checked]:bg-mint-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green/30"
            >
              <input type="radio" name="membershipStatus" value={m.value} required={i === 0} className="peer sr-only" />
              <span className="text-sm font-semibold text-heading">{m.label}</span>
              <span className="text-xs leading-relaxed text-muted-2">{m.description}</span>
              <CheckCircle2
                className="absolute right-3 top-3 size-5 text-green opacity-0 transition-opacity peer-checked:opacity-100"
                aria-hidden="true"
              />
            </label>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-2">
          Existing members are verified against VAAP membership records for your account. If accepted, future members
          complete the standard membership registration and billing before final appointment.
        </p>
      </Section>

      <div className="flex flex-col gap-5 rounded-xl border border-line bg-card px-6 py-6 md:px-8">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-green">Declaration</span>
            <span className="font-serif text-lg font-semibold text-heading">Commitments</span>
          </legend>
          {LEADERSHIP_COMMITMENTS.map((c) => (
            <label key={c.key} className="flex items-start gap-3 text-sm leading-relaxed text-body">
              <input type="checkbox" name={c.key} required className="mt-1 size-4 shrink-0 accent-green" />
              {c.label}
            </label>
          ))}
        </fieldset>
        <label className="flex items-start gap-3 border-t border-line-light pt-4 text-sm leading-relaxed text-body">
          <input type="checkbox" name="consent" required className="mt-1 size-4 shrink-0 accent-green" />
          I confirm this information is accurate and agree that VAAP may publish an edited version of my profile if approved.
        </label>
        {state && !state.ok && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-2">
            <span className="text-green">*</span> Required fields
          </p>
          <button
            type="submit"
            disabled={pending || uploading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-green px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-green-hover disabled:opacity-50 sm:w-auto"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {pending ? "Submitting…" : uploading ? "Uploading photo…" : "Submit application"}
          </button>
        </div>
      </div>
    </form>
  )
}
