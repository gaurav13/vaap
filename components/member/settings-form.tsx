"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"

export function ChangePasswordForm() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [msg, setMsg] = useState("")

  async function action(formData: FormData) {
    const currentPassword = String(formData.get("currentPassword") ?? "")
    const newPassword = String(formData.get("newPassword") ?? "")
    const confirm = String(formData.get("confirm") ?? "")

    if (newPassword.length < 8) {
      setState("error")
      setMsg("New password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirm) {
      setState("error")
      setMsg("New passwords do not match.")
      return
    }

    setState("loading")
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })
    if (error) {
      setState("error")
      setMsg(error.message ?? "Could not update password.")
      return
    }
    setState("done")
    setMsg("Password updated successfully.")
  }

  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <PwField name="currentPassword" label="Current password" />
      <PwField name="newPassword" label="New password" />
      <PwField name="confirm" label="Confirm new password" />
      {state !== "idle" && state !== "loading" && (
        <p className={`text-sm font-medium ${state === "done" ? "text-green" : "text-destructive"}`}>{msg}</p>
      )}
      <div>
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
        >
          {state === "loading" ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  )
}

function PwField({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-heading">{label}</span>
      <input
        name={name}
        type="password"
        required
        className="w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
      />
    </label>
  )
}

export function NotificationToggles() {
  const [prefs, setPrefs] = useState({
    events: true,
    news: true,
    voting: true,
    marketing: false,
  })

  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: "events", label: "Event reminders", desc: "Upcoming VAAP events and workshops." },
    { key: "news", label: "Industry updates", desc: "Latest news and policy developments." },
    { key: "voting", label: "Voting notifications", desc: "Alerts when a vote opens or closes." },
    { key: "marketing", label: "Promotional emails", desc: "Partner offers and community programs." },
  ]

  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((item) => (
        <li key={item.key} className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-semibold text-heading">{item.label}</p>
            <p className="text-xs text-muted-2">{item.desc}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs[item.key]}
            aria-label={item.label}
            onClick={() => setPrefs((p) => ({ ...p, [item.key]: !p[item.key] }))}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              prefs[item.key] ? "bg-green" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                prefs[item.key] ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </li>
      ))}
    </ul>
  )
}
