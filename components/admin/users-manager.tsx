"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { setUserRole, setUserPassword, deleteUser } from "@/app/actions/admin"

type UserRow = {
  id: string
  name: string
  email: string
  role: "member" | "staff" | "manager" | "admin"
  createdAt: string
  isPaid: boolean
  membershipId: string | null
}

type UserType = "super-admin" | "admin" | "staff" | "paid" | "unpaid"

const USER_TYPE: Record<UserType, { label: string; className: string }> = {
  "super-admin": { label: "Super Admin", className: "border-navy bg-navy text-white" },
  admin: { label: "Admin", className: "border-navy/20 bg-navy/10 text-navy" },
  staff: { label: "Staff", className: "border-line bg-muted/60 text-heading" },
  paid: { label: "Paid Member", className: "border-green-border bg-mint text-green" },
  unpaid: { label: "Non-Paid", className: "border-amber-200 bg-amber-50 text-amber-800" },
}

function userType(u: UserRow): UserType {
  if (u.role === "admin") return "super-admin"
  if (u.role === "manager") return "admin"
  if (u.role === "staff") return "staff"
  return u.isPaid ? "paid" : "unpaid"
}

const FILTERS: { key: "all" | UserType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "super-admin", label: "Super Admin" },
  { key: "paid", label: "Paid" },
  { key: "unpaid", label: "Non-Paid" },
  { key: "admin", label: "Admin" },
  { key: "staff", label: "Staff" },
]

const ROLES = ["member", "staff", "manager", "admin"] as const
const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  member: "Member",
  staff: "Staff",
  manager: "Admin",
  admin: "Super Admin",
}

function generatePassword(length = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*"
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  let out = ""
  for (let i = 0; i < length; i++) out += chars[values[i] % chars.length]
  return out
}

function PasswordDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await setUserPassword(user.id, password)
      if (res && !res.ok) {
        setError(res.error ?? "Could not set password.")
        return
      }
      setDone(true)
    })
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError("Copy failed — select and copy the password manually.")
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Set password for ${user.name}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-heading">Set password</h3>
        <p className="mt-1 text-sm text-muted-2">
          {user.name} <span className="text-muted-2">·</span> {user.email}
        </p>

        {done ? (
          <div className="mt-5">
            <p className="text-sm font-semibold text-green">Password updated.</p>
            <p className="mt-2 text-sm text-muted-2">
              Share this password securely with the user. They can sign in immediately and change it later.
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-muted/40 px-3 py-2.5">
              <code className="flex-1 break-all font-mono text-sm text-heading">{password}</code>
              <button
                type="button"
                onClick={copy}
                className="shrink-0 rounded-md bg-navy px-2.5 py-1 text-xs font-semibold text-white hover:bg-navy/90"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green/90"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-wide text-muted-2">
              New password
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 focus-within:border-green-border focus-within:ring-2 focus-within:ring-green/20">
              <input
                id="new-password"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="min-w-0 flex-1 bg-transparent font-mono text-sm text-heading outline-none"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="shrink-0 text-xs font-semibold text-muted-2 hover:text-heading"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setPassword(generatePassword())
                setShow(true)
              }}
              className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:bg-mint"
            >
              Generate strong password
            </button>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted-2 hover:bg-muted/40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || password.length < 8}
                onClick={save}
                className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Saving…" : "Set password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function UsersManager({ items, currentUserId }: { items: UserRow[]; currentUserId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [pwUser, setPwUser] = useState<UserRow | null>(null)
  const [filter, setFilter] = useState<"all" | UserType>("all")

  function change(userId: string, role: (typeof ROLES)[number]) {
    setError(null)
    startTransition(async () => {
      const res = await setUserRole(userId, role)
      if (res && !res.ok) {
        setError(res.error ?? "Could not update role.")
        return
      }
      router.refresh()
    })
  }

  function remove(u: UserRow) {
    if (!confirm(`Permanently delete the account for ${u.name} (${u.email})? They will no longer be able to sign in.`)) return
    setError(null)
    startTransition(async () => {
      const res = await deleteUser(u.id)
      if (res && !res.ok) {
        setError(res.error ?? "Could not delete user.")
        return
      }
      router.refresh()
    })
  }

  const counts = items.reduce<Record<string, number>>(
    (acc, u) => {
      const t = userType(u)
      acc[t] = (acc[t] ?? 0) + 1
      return acc
    },
    { all: items.length },
  )

  const q = query.toLowerCase()
  const visible = items.filter(
    (u) =>
      (filter === "all" || userType(u) === filter) &&
      (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
  )

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filter users by type" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === f.key
                  ? "border-navy bg-navy text-white"
                  : "border-line bg-card text-muted-2 hover:bg-mint hover:text-navy",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] leading-none",
                  filter === f.key ? "bg-white/20 text-white" : "bg-muted/60 text-heading",
                )}
              >
                {counts[f.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search users"
          className="w-full max-w-sm rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-heading outline-none focus:border-green-border focus:ring-2 focus:ring-green/20"
        />
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="hidden grid-cols-[1.5fr_1fr_1fr_auto_auto] gap-4 border-b border-line bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-2 sm:grid">
          <span>User</span>
          <span>Type</span>
          <span>Joined</span>
          <span>Role</span>
          <span>Actions</span>
        </div>
        <ul className="divide-y divide-line">
          {visible.map((u) => (
            <li key={u.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1.5fr_1fr_1fr_auto_auto] sm:items-center sm:gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-heading">
                  {u.name}
                  {u.id === currentUserId && <span className="ml-2 text-xs font-normal text-green">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted-2">{u.email}</p>
              </div>
              <div className="flex min-w-0 flex-col items-start gap-1">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    USER_TYPE[userType(u)].className,
                  )}
                >
                  {USER_TYPE[userType(u)].label}
                </span>
                {u.isPaid && u.membershipId && (
                  <span className="truncate font-mono text-[11px] text-muted-2">{u.membershipId}</span>
                )}
              </div>
              <p className="text-xs text-muted-2">
                {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <div className="flex gap-1 rounded-lg border border-line p-1">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={pending || (u.id === currentUserId && r !== "admin")}
                    onClick={() => change(u.id, r)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors disabled:cursor-not-allowed",
                      u.role === r ? "bg-navy text-white" : "text-muted-2 hover:bg-mint hover:text-navy disabled:opacity-40",
                    )}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPwUser(u)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-mint"
                >
                  Set password
                </button>
                <button
                  type="button"
                  onClick={() => remove(u)}
                  disabled={pending || u.id === currentUserId}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {visible.length === 0 && <li className="p-8 text-center text-sm text-muted-2">No users found.</li>}
        </ul>
      </div>

      {pwUser && <PasswordDialog user={pwUser} onClose={() => setPwUser(null)} />}
    </div>
  )
}
