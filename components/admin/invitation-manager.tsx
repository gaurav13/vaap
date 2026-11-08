"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, KeyRound, Trash2 } from "lucide-react"
import { createInvitationCode, deleteInvitationCode, setInvitationCodeActive } from "@/app/actions/invitations"

export type InvitationRow = {
  id: number
  code: string
  label: string
  maxUses: number | null
  usedCount: number
  active: boolean
  expiresAt: string | null
  createdAt: string
}

const INPUT =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/15"

function statusOf(row: InvitationRow): { label: string; className: string } {
  if (!row.active) return { label: "Disabled", className: "bg-muted text-muted-2" }
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return { label: "Expired", className: "bg-destructive/10 text-destructive" }
  if (row.maxUses != null && row.usedCount >= row.maxUses) return { label: "Used up", className: "bg-muted text-muted-2" }
  return { label: "Active", className: "bg-mint text-green" }
}

export function InvitationManager({ codes }: { codes: InvitationRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  function onCreate(formData: FormData) {
    setError(null)
    setCreated(null)
    const maxUsesRaw = String(formData.get("maxUses") ?? "").trim()
    startTransition(async () => {
      const res = await createInvitationCode({
        code: String(formData.get("code") ?? ""),
        label: String(formData.get("label") ?? ""),
        maxUses: maxUsesRaw ? Number(maxUsesRaw) : null,
        expiresAt: String(formData.get("expiresAt") ?? "") || null,
      })
      if (!res.ok) return setError(res.error)
      setCreated(res.code ?? null)
      router.refresh()
    })
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6" aria-labelledby="codes-heading">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-mint text-green">
          <KeyRound className="size-4" aria-hidden />
        </span>
        <div>
          <h2 id="codes-heading" className="font-serif text-lg font-bold text-heading">
            Academic &amp; Research invitation codes
          </h2>
          <p className="text-sm text-muted-2">Applicants must enter a valid code to apply for this membership.</p>
        </div>
      </div>

      <form action={onCreate} className="mt-6 grid gap-4 rounded-xl border border-line bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <label className="flex flex-col gap-1.5 lg:col-span-1">
          <span className="text-xs font-semibold text-heading">Code (optional)</span>
          <input name="code" placeholder="Auto-generate" className={`${INPUT} font-mono uppercase`} />
        </label>
        <label className="flex flex-col gap-1.5 lg:col-span-1">
          <span className="text-xs font-semibold text-heading">Institution / note</span>
          <input name="label" placeholder="e.g. NUST" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-heading">Max uses</span>
          <input name="maxUses" type="number" min={1} placeholder="Unlimited" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-heading">Expires on</span>
          <input name="expiresAt" type="date" className={INPUT} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create code"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
      {created && (
        <p className="mt-3 text-sm text-body">
          Created <span className="font-mono font-semibold text-green">{created}</span>. Share it with the institution.
        </p>
      )}

      <div className="mt-6 overflow-x-auto">
        {codes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-2">No invitation codes yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted-2">
              <tr>
                <th className="py-2 pr-4 font-semibold">Code</th>
                <th className="py-2 pr-4 font-semibold">Note</th>
                <th className="py-2 pr-4 font-semibold">Uses</th>
                <th className="py-2 pr-4 font-semibold">Expires</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {codes.map((row) => {
                const status = statusOf(row)
                return (
                  <tr key={row.id}>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => copy(row.code)}
                        className="inline-flex items-center gap-2 font-mono font-semibold text-heading hover:text-green"
                        aria-label={`Copy code ${row.code}`}
                      >
                        {row.code}
                        {copied === row.code ? <Check className="size-3.5 text-green" /> : <Copy className="size-3.5 text-muted-2" />}
                      </button>
                    </td>
                    <td className="py-3 pr-4 text-body">{row.label || "—"}</td>
                    <td className="py-3 pr-4 text-body">
                      {row.usedCount} / {row.maxUses ?? "∞"}
                    </td>
                    <td className="py-3 pr-4 text-body">
                      {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString("en-GB") : "Never"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              await setInvitationCodeActive(row.id, !row.active)
                              router.refresh()
                            })
                          }
                          className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-heading hover:bg-muted"
                        >
                          {row.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`Delete code ${row.code}?`)) return
                            startTransition(async () => {
                              await deleteInvitationCode(row.id)
                              router.refresh()
                            })
                          }}
                          className="rounded-md p-1.5 text-muted-2 hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Delete code ${row.code}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
