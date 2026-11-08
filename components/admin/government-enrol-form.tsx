"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Landmark } from "lucide-react"
import { enrolGovernmentMember } from "@/app/actions/invitations"

const INPUT =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/15"

export function GovernmentEnrolForm({ plans }: { plans: string[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    setDone(null)
    startTransition(async () => {
      const res = await enrolGovernmentMember({
        category: String(formData.get("category") ?? ""),
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        organization: String(formData.get("organization") ?? ""),
        designation: String(formData.get("designation") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        approveNow: formData.get("approveNow") === "on",
      })
      if (!res.ok) return setError(res.error)
      setDone(res.reference ?? "")
      formRef.current?.reset()
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6" aria-labelledby="gov-heading">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-mint text-green">
          <Landmark className="size-4" aria-hidden />
        </span>
        <div>
          <h2 id="gov-heading" className="font-serif text-lg font-bold text-heading">
            Enrol a Government &amp; Public Institution member
          </h2>
          <p className="text-sm text-muted-2">This membership is not available on the public application form.</p>
        </div>
      </div>

      {plans.length === 0 ? (
        <p className="mt-6 text-sm text-muted-2">No Government membership plan is configured.</p>
      ) : (
        <form ref={formRef} action={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-heading">Membership plan</span>
            <select name="category" className={INPUT} defaultValue={plans[0]}>
              {plans.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-heading">Institution name *</span>
            <input name="organization" required className={INPUT} placeholder="e.g. Ministry of Finance" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-heading">Contact person *</span>
            <input name="name" required className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-heading">Designation</span>
            <input name="designation" className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-heading">Official email *</span>
            <input name="email" type="email" required className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-heading">Phone</span>
            <input name="phone" className={INPUT} />
          </label>
          <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-body">
              <input name="approveNow" type="checkbox" defaultChecked className="size-4 accent-[var(--color-green)]" />
              Approve immediately and create the member account
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
            >
              {pending ? "Enrolling…" : "Enrol member"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
      {done && (
        <p className="mt-3 text-sm text-body">
          Member enrolled with reference <span className="font-mono font-semibold text-green">{done}</span>.
        </p>
      )}
    </section>
  )
}
