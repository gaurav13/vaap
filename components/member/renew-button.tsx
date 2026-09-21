"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { requestRenewal } from "@/app/actions/member"

export function RenewButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [msg, setMsg] = useState("")

  async function onClick() {
    setState("loading")
    const res = await requestRenewal()
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
        Renewal request submitted. Our team will review it and confirm your new term shortly.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={state === "loading"}
        className="inline-flex w-fit items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
      >
        <RefreshCw className={`size-4 ${state === "loading" ? "animate-spin" : ""}`} />
        {state === "loading" ? "Submitting…" : "Request renewal"}
      </button>
      {state === "error" && <p className="text-sm text-destructive">{msg}</p>}
    </div>
  )
}
