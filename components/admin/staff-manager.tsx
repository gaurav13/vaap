"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { saveStaffProfile, getStaffRewards, type StaffTeamMember } from "@/app/actions/admin-staff"

type Committee = { id: number; name: string }
type RewardRow = {
  id: number
  memberName: string
  rewardAmount: number
  currency: string
  status: string
  createdAt: string | Date
}

function money(amount: number, currency = "PKR") {
  return `${currency} ${amount.toLocaleString("en-US")}`
}

function roleLabel(role: string) {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function EditPanel({
  member,
  committees,
  onClose,
}: {
  member: StaffTeamMember
  committees: Committee[]
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [rewards, setRewards] = useState<RewardRow[] | null>(null)
  const [loadingRewards, setLoadingRewards] = useState(false)

  function loadRewards() {
    if (rewards || loadingRewards) return
    setLoadingRewards(true)
    getStaffRewards(member.userId)
      .then((rows) => setRewards(rows as RewardRow[]))
      .catch(() => setError("Could not load rewards."))
      .finally(() => setLoadingRewards(false))
  }

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await saveStaffProfile(formData)
      if (res && !res.ok) {
        setError(res.error ?? "Could not save profile.")
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit profile for ${member.name}`}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-heading">{member.name}</h3>
            <p className="mt-0.5 text-sm text-muted-2">
              {member.email} <span className="text-muted-2">·</span>{" "}
              <span className="font-semibold text-navy">{roleLabel(member.role)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-sm text-muted-2 hover:bg-muted/40"
          >
            Close
          </button>
        </div>

        <form action={submit} className="mt-5 grid gap-4">
          <input type="hidden" name="userId" value={member.userId} />

          <div>
            <label htmlFor="position" className="text-xs font-semibold uppercase tracking-wide text-muted-2">
              Position in VAAP
            </label>
            <input
              id="position"
              name="position"
              defaultValue={member.position}
              placeholder="e.g. Secretary General, Treasurer"
              className="mt-1.5 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-heading outline-none focus:border-green-border focus:ring-2 focus:ring-green/20"
            />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">Committees</span>
            <p className="mt-0.5 text-xs text-muted-2">Select one or more committees this member belongs to.</p>
            <div className="mt-2 grid gap-1.5 rounded-lg border border-line p-3 sm:grid-cols-2">
              {committees.length === 0 && <p className="text-sm text-muted-2">No committees available.</p>}
              {committees.map((c) => (
                <label key={c.id} className="flex items-center gap-2.5 text-sm text-heading">
                  <input
                    type="checkbox"
                    name="committeeId"
                    value={c.id}
                    defaultChecked={member.committeeIds.includes(c.id)}
                    className="size-4 rounded border-line text-green focus:ring-green/20"
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wide text-muted-2">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={member.phone ?? ""}
              placeholder="+92 …"
              className="mt-1.5 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-heading outline-none focus:border-green-border focus:ring-2 focus:ring-green/20"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-heading">
            <input
              type="checkbox"
              name="isCommitteeHead"
              defaultChecked={member.isCommitteeHead}
              className="size-4 rounded border-line text-green focus:ring-green/20"
            />
            Committee head
          </label>

          <div>
            <label htmlFor="photo" className="text-xs font-semibold uppercase tracking-wide text-muted-2">
              Photo URL
            </label>
            <input
              id="photo"
              name="photo"
              defaultValue={member.photo ?? ""}
              placeholder="https://…"
              className="mt-1.5 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-heading outline-none focus:border-green-border focus:ring-2 focus:ring-green/20"
            />
          </div>

          <div>
            <label htmlFor="bio" className="text-xs font-semibold uppercase tracking-wide text-muted-2">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={member.bio}
              rows={4}
              placeholder="Short professional bio…"
              className="mt-1.5 w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-heading outline-none focus:border-green-border focus:ring-2 focus:ring-green/20"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted-2 hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-heading">Referral rewards</h4>
            <div className="text-right text-xs text-muted-2">
              <span className="font-semibold text-heading">{money(member.rewardsTotal)}</span> earned
              <span className="mx-1">·</span>
              <span className="font-semibold text-green">{money(member.rewardsPaid)}</span> paid
            </div>
          </div>

          {member.rewardsCount === 0 ? (
            <p className="mt-3 text-sm text-muted-2">No rewards earned yet.</p>
          ) : rewards === null ? (
            <button
              type="button"
              onClick={loadRewards}
              disabled={loadingRewards}
              className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy hover:bg-mint disabled:opacity-50"
            >
              {loadingRewards ? "Loading…" : `View ${member.rewardsCount} reward${member.rewardsCount === 1 ? "" : "s"}`}
            </button>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
              {rewards.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-heading">{r.memberName || "Referred member"}</p>
                    <p className="text-xs text-muted-2">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-heading">{money(r.rewardAmount, r.currency)}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-2">{r.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export function StaffManager({ team, committees }: { team: StaffTeamMember[]; committees: Committee[] }) {
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<StaffTeamMember | null>(null)

  const visible = team.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase()) ||
      m.position.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="mt-6">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, email, or position…"
        className="mb-4 w-full max-w-sm rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-heading outline-none focus:border-green-border focus:ring-2 focus:ring-green/20"
      />

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="hidden grid-cols-[1.6fr_1.2fr_1fr_auto] gap-4 border-b border-line bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-2 sm:grid">
          <span>Member</span>
          <span>Position</span>
          <span>Rewards earned</span>
          <span className="sr-only">Actions</span>
        </div>
        <ul className="divide-y divide-line">
          {visible.map((m) => (
            <li key={m.userId} className="grid gap-3 px-5 py-4 sm:grid-cols-[1.6fr_1.2fr_1fr_auto] sm:items-center sm:gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-heading">{m.name}</p>
                <p className="truncate text-xs text-muted-2">
                  {m.email} <span className="text-muted-2">·</span> {roleLabel(m.role)}
                </p>
              </div>
              <div className="min-w-0 text-sm text-heading">
                {m.position ? (
                  <>
                    <span className="font-medium">{m.position}</span>
                    {m.committeeNames.length > 0 && (
                      <span className="block truncate text-xs text-muted-2">
                        {m.committeeNames.join(", ")}
                        {m.isCommitteeHead ? " (Head)" : ""}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs italic text-muted-2">Not set</span>
                )}
              </div>
              <div className="text-sm">
                <span className="font-semibold text-heading">{money(m.rewardsTotal)}</span>
                {m.rewardsCount > 0 && (
                  <span className="block text-xs text-muted-2">
                    {m.rewardsCount} reward{m.rewardsCount === 1 ? "" : "s"} · {money(m.rewardsPaid)} paid
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditing(m)}
                className="justify-self-start rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-mint sm:justify-self-auto"
              >
                Manage
              </button>
            </li>
          ))}
          {visible.length === 0 && (
            <li className="p-8 text-center text-sm text-muted-2">No team members found.</li>
          )}
        </ul>
      </div>

      {editing && <EditPanel member={editing} committees={committees} onClose={() => setEditing(null)} />}
    </div>
  )
}
