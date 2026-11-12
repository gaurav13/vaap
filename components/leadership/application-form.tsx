"use client"

import { useActionState, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { submitLeadershipApplication } from "@/app/actions/leadership"
import { APPLICATION_KINDS } from "@/lib/leadership"
import { PhotoUpload } from "@/components/leadership/photo-upload"

const input =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-heading placeholder:text-muted-2 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
const label = "text-sm font-medium text-heading"

function Field({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={label}>
        {title}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-2">{hint}</p>}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 border-t border-line pt-6">
      <legend className="pb-2 font-serif text-lg font-semibold text-heading">{title}</legend>
      {children}
    </fieldset>
  )
}

export function LeadershipApplicationForm({ defaultEmail, defaultName }: { defaultEmail: string; defaultName: string }) {
  const [state, action, pending] = useActionState(submitLeadershipApplication, null)
  const [uploading, setUploading] = useState(false)

  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-xl border border-line bg-card p-6">
        <CheckCircle2 className="size-6 text-green" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-heading">Application submitted</h2>
        <p className="leading-relaxed text-muted-2">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-8">
      <Group title="Position">
        <Field id="kind" title="Applying for">
          <select id="kind" name="kind" required defaultValue="" className={input}>
            <option value="" disabled>
              Select a leadership group
            </option>
            {APPLICATION_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="portfolio" title="Proposed portfolio / area of contribution" hint="e.g. Regulatory affairs, Web3 education, Exchange compliance">
          <input id="portfolio" name="portfolio" required maxLength={600} className={input} />
        </Field>
      </Group>

      <Group title="Professional details">
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
          <Field id="position" title="Current role at organization" hint="Optional">
            <input id="position" name="position" maxLength={120} className={input} />
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={label}>Profile photograph</span>
          <PhotoUpload name="photo" onBusyChange={setUploading} />
        </div>
      </Group>

      <Group title="About you">
        <Field
          id="bio"
          title="Biography"
          hint="Plain facts about your career, expertise and achievements. Our editors will polish the final wording with you."
        >
          <textarea id="bio" name="bio" required minLength={80} maxLength={8000} rows={7} className={`${input} leading-relaxed`} />
        </Field>
        <Field id="responsibility" title="Key experience & responsibilities" hint="Optional">
          <textarea id="responsibility" name="responsibility" maxLength={600} rows={3} className={`${input} leading-relaxed`} />
        </Field>
        <Field id="message" title="Why do you want to serve VAAP?" hint="Optional">
          <textarea id="message" name="message" maxLength={3000} rows={4} className={`${input} leading-relaxed`} />
        </Field>
      </Group>

      <Group title="Public links">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["linkedin", "LinkedIn URL"],
            ["x", "X (Twitter) URL"],
            ["website", "Website"],
            ["facebook", "Facebook URL"],
            ["instagram", "Instagram URL"],
          ].map(([id, title]) => (
            <Field key={id} id={id} title={title}>
              <input id={id} name={id} type="url" maxLength={2048} placeholder="https://" className={input} />
            </Field>
          ))}
          <Field id="email" title="Public email" hint="Optional, shown on your profile">
            <input id="email" name="email" type="email" maxLength={200} className={input} />
          </Field>
        </div>
      </Group>

      <Group title="Private contact">
        <p className="-mt-2 text-sm text-muted-2">Only the VAAP review team sees these.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="contactEmail" title="Contact email">
            <input id="contactEmail" name="contactEmail" type="email" required defaultValue={defaultEmail} className={input} />
          </Field>
          <Field id="contactPhone" title="Phone / WhatsApp">
            <input id="contactPhone" name="contactPhone" type="tel" maxLength={40} autoComplete="tel" className={input} />
          </Field>
        </div>
      </Group>

      <div className="flex flex-col gap-4 border-t border-line pt-6">
        <label className="flex items-start gap-3 text-sm leading-relaxed text-muted-2">
          <input type="checkbox" name="consent" required className="mt-1 size-4 accent-green" />
          I confirm this information is accurate and agree that VAAP may publish an edited version of my profile if approved.
        </label>
        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || uploading}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-green/90 disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {pending ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </form>
  )
}
