"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowUpCircle, Send } from "lucide-react"
import { requestUpgrade } from "@/app/actions/member"

const CATEGORIES = [
  "Corporate Members",
  "Associate Members",
  "Individual Members",
  "Startup Members",
]

/**
 * Lets a user without an active membership start an application from the
 * dashboard. Choosing a category sends them to the full multi-step
 * application form with that membership type preselected, so they land
 * directly on the information step rather than submitting a bare request.
 */
export function ApplyButton({ plans }: { plans: { id: number; title: string }[] }) {
  const router = useRouter()
  const [planId, setPlanId] = useState("")

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!planId) return
    router.push(`/membership/apply?plan=${planId}`)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <select
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        className="w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
      >
        <option value="">Select a membership category…</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!planId}
        className="inline-flex w-fit items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
      >
        Continue to application
        <ArrowRight className="size-4" />
      </button>
    </form>
  )
}

/**
 * Lets an existing member request an upgrade to a different membership tier.
 * The request is logged as a pending application for staff review.
 */
export function UpgradeButton({ currentCategory }: { currentCategory?: string | null }) {
  const [category, setCategory] = useState("")
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [msg, setMsg] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState("loading")
    const fd = new FormData()
    fd.set("category", category)
    const res = await requestUpgrade(fd)
    if (res.ok) {
      setState("done")
    } else {
      setState("error")
      setMsg(res.error ?? "Something went wrong.")
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-lg bg-mint px-4 py-3 text-sm font-medium text-green">
        Upgrade request submitted. Our team will review it and follow up shortly.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
      >
        <option value="">Select a tier to upgrade to…</option>
        {CATEGORIES.filter((c) => c !== currentCategory).map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={state === "loading" || !category}
        className="inline-flex w-fit items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
      >
        <ArrowUpCircle className="size-4" />
        {state === "loading" ? "Submitting…" : "Request upgrade"}
      </button>
      {state === "error" && <p className="text-sm text-destructive">{msg}</p>}
    </form>
  )
}
