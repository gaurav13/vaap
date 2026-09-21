"use client"

import { useState } from "react"
import { submitContactMessage } from "@/app/actions/public"

export function SupportForm({ name, email }: { name: string; email: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [msg, setMsg] = useState("")

  async function action(formData: FormData) {
    setState("loading")
    const res = await submitContactMessage(formData)
    if (res.ok) {
      setState("done")
    } else {
      setState("error")
      setMsg(res.error ?? "Please fill in all required fields.")
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg bg-mint px-4 py-6 text-center">
        <p className="text-sm font-semibold text-green">Your message has been sent.</p>
        <p className="mt-1 text-sm text-muted-2">Our support team will get back to you within 1–2 business days.</p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="email" value={email} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-heading">Subject</span>
        <input
          name="subject"
          required
          placeholder="How can we help?"
          className="w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-heading">Message</span>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Describe your question or issue in detail…"
          className="w-full resize-y rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
        />
      </label>
      {state === "error" && <p className="text-sm text-destructive">{msg}</p>}
      <div>
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
        >
          {state === "loading" ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  )
}
