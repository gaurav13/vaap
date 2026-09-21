"use client"

import { useState, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { submitMembershipApplication } from "@/app/actions/public"

const CATEGORIES = [
  "Corporate Members",
  "International Members",
  "Startup Members",
  "Associate & Professional Members",
  "Student Members",
  "Media & Influencer Members",
  "Verified Community Members",
]

export function MembershipForm() {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await submitMembershipApplication(formData)
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.")
        return
      }
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-border bg-mint/50 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-green" />
        <h3 className="mt-4 font-serif text-xl font-bold text-heading">Application received</h3>
        <p className="mt-2 text-body">
          Thank you for your interest in joining VAAP. Our team will review your application and get back to you by
          email.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-card p-6 lg:p-8">
      <div className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" required>
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="Email" required>
            <input type="email" name="email" required className={inputCls} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Organization">
            <input name="organization" className={inputCls} />
          </Field>
          <Field label="Membership category">
            <select name="category" defaultValue={CATEGORIES[0]} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Tell us about yourself or your organization">
          <textarea name="message" rows={5} className={inputCls} />
        </Field>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending} size="lg" className="mt-6 w-full sm:w-auto">
        {pending ? "Submitting…" : "Submit Application"}
      </Button>
    </form>
  )
}

const inputCls =
  "w-full rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm text-heading outline-none transition-colors focus:border-green-border focus:ring-2 focus:ring-green/20"

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-body">
        {label} {required && <span className="text-green">*</span>}
      </span>
      {children}
    </label>
  )
}
