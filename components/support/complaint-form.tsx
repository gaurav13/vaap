"use client"

import { useState, useRef, type FormEvent } from "react"
import { FileText, Paperclip, ArrowRight, Lock, CheckCircle2, Loader2 } from "lucide-react"
import { submitComplaint } from "@/app/actions/support"

const CATEGORIES = [
  "Complaint Assistance",
  "Scam / Fraud Report",
  "AML/CFT Question",
  "Regulatory Referral",
  "Membership Issue",
  "Other",
]

export function ComplaintForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const result = await submitComplaint(new FormData(e.currentTarget))
      if (result.ok) {
        setReference(result.reference)
        formRef.current?.reset()
        setCount(0)
      } else {
        setError(result.error)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setPending(false)
    }
  }

  if (reference) {
    return (
      <div className="rounded-2xl border border-line bg-card p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-mint text-green">
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="mt-4 font-serif text-2xl text-heading">Complaint Submitted</h3>
        <p className="mt-2 text-sm leading-relaxed text-body">
          Thank you. Your case reference is{" "}
          <span className="font-semibold text-green">{reference}</span>. We&apos;ve emailed you a copy — please keep
          this reference to track your case.
        </p>
        <button
          type="button"
          onClick={() => setReference(null)}
          className="mt-6 inline-flex items-center justify-center rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-surface"
        >
          Submit another complaint
        </button>
      </div>
    )
  }

  return (
    <div id="complaint" className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex items-center gap-4 bg-green px-6 py-5 text-white">
        <span className="flex size-11 items-center justify-center rounded-lg bg-white/15">
          <FileText className="size-6" />
        </span>
        <div>
          <h2 className="font-serif text-xl">Submit a Complaint</h2>
          <p className="text-sm text-white/80">Your information is treated with strict confidentiality.</p>
        </div>
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="grid gap-5 p-6">
        <Field label="Full Name" required>
          <input
            name="name"
            required
            placeholder="Enter your full name"
            className="input-base"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email Address" required>
            <input
              name="email"
              type="email"
              required
              placeholder="Enter your email"
              className="input-base"
            />
          </Field>
          <Field label="Phone Number">
            <input
              name="phone"
              inputMode="tel"
              placeholder="+92 300 1234567"
              className="input-base"
            />
          </Field>
        </div>

        <Field label="Subject" required>
          <select name="category" required defaultValue="" className="input-base">
            <option value="" disabled>
              Select a category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description" required>
          <textarea
            name="description"
            required
            rows={5}
            maxLength={1000}
            onChange={(e) => setCount(e.target.value.length)}
            placeholder="Please provide details of your concern..."
            className="input-base resize-y"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{count}/1000</p>
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-heading">
            Attach Files <span className="text-muted-foreground">(optional)</span>
          </p>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-surface px-4 py-4 text-sm text-body transition-colors hover:border-green">
            <Paperclip className="size-5 text-muted-foreground" />
            <span>
              <span className="font-semibold text-heading">Choose files</span> or drag and drop
              <br />
              <span className="text-xs text-muted-foreground">PDF, JPG, PNG (Max 5MB)</span>
            </span>
            <input type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" />
          </label>
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-green px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit Complaint
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" />
          We never ask for private keys, seed phrases, passwords or wallet recovery credentials.
        </p>
      </form>
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
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-heading">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </span>
      {children}
    </label>
  )
}
