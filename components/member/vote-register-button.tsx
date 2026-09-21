"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { registerToVote } from "@/app/actions/member"

export function VoteRegisterButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  async function onClick() {
    setSaving(true)
    setStatus(null)
    const res = await registerToVote()
    setSaving(false)
    if (res.ok) {
      setStatus({ ok: true, msg: "Registration submitted. Our governance team will confirm your eligibility." })
      router.refresh()
    } else {
      setStatus({ ok: false, msg: res.error ?? "Registration failed." })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={saving || disabled}
        className="inline-flex w-fit items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
      >
        {saving ? "Submitting…" : "Register to vote"}
      </button>
      {status && (
        <p className={`text-sm font-medium ${status.ok ? "text-green" : "text-destructive"}`}>{status.msg}</p>
      )}
    </div>
  )
}
