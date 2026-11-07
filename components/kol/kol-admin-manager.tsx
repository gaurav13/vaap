"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, ExternalLink, FileText, Loader2, Pencil, Search, UserPlus, UserRound } from "lucide-react"
import { KolAdminEditor } from "@/components/kol/kol-admin-editor"
import { adminInviteKols, adminSetKolCheck, adminSetKolStatus } from "@/app/actions/kol"
import type { KolEvidence, KolPlatform } from "@/lib/db/schema"
import { KOL_STATUSES, KOL_STATUS_LABEL, formatCount, formatDate, platformLabel, type KolStatus } from "@/lib/kol-shared"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { KolStatusPill, PlatformIcon } from "@/components/kol/kol-ui"

export type AdminKolRow = {
  memberId: number
  referralCode: string | null
  referralActive: boolean
  hasLogin: boolean
  slug: string
  status: string
  memberName: string
  memberEmail: string
  memberStatus: string
  displayName: string
  fullName: string
  professionalName: string
  collabInterests: string
  photo: string
  title: string
  organization: string
  city: string
  country: string
  bio: string
  expertise: string[]
  platforms: KolPlatform[]
  monthlyReach: number
  mediaAppearances: string
  collaborations: string
  achievements: string
  evidence: KolEvidence[]
  evidenceNotes: string
  identityVerified: boolean
  metricsVerified: boolean
  adminNote: string
  ownershipCode: string
  submittedAt: string | null
  verifiedAt: string | null
  expiresAt: string | null
  invitedAt: string | null
  reviewedBy: string | null
  audit: {
    id: number
    action: string
    fromStatus: string | null
    toStatus: string | null
    note: string
    actor: string
    createdAt: string
  }[]
}

type Invitable = { id: number; name: string; email: string }

const DECISIONS: { status: KolStatus; label: string; tone: string; needsNote?: boolean }[] = [
  { status: "under_review", label: "Start review", tone: "outline" },
  { status: "info_required", label: "Request info", tone: "outline", needsNote: true },
  { status: "verified", label: "Approve & verify", tone: "primary" },
  { status: "rejected", label: "Reject", tone: "danger", needsNote: true },
  { status: "revoked", label: "Revoke badge", tone: "danger", needsNote: true },
]

export function KolAdminManager({ items, invitable }: { items: AdminKolRow[]; invitable: Invitable[] }) {
  const [filter, setFilter] = useState<string>("pending")
  const [query, setQuery] = useState("")
  const [openId, setOpenId] = useState<number | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [startEditing, setStartEditing] = useState(false)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length }
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1
    return c
  }, [items])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(
      (i) =>
        (filter === "all" || i.status === filter) &&
        (!q || `${i.displayName} ${i.memberEmail} ${i.organization}`.toLowerCase().includes(q)),
    )
  }, [items, filter, query])

  const open = items.find((i) => i.memberId === openId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          {(["all", ...KOL_STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={filter === s}
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === s ? "border-navy bg-navy text-card" : "border-line bg-card text-body hover:border-navy"
              }`}
            >
              {s === "all" ? "All" : KOL_STATUS_LABEL[s]} ({counts[s] ?? 0})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, org"
              aria-label="Search KOLs"
              className="w-60 pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-4" aria-hidden="true" />
            Invite members
          </Button>
          <a href="/api/admin/kol/export" className={buttonVariants({ variant: "outline", className: "h-10 px-3" })}>
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </a>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted-2">
            <tr>
              <th className="px-4 py-3 font-semibold">Applicant</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Reach</th>
              <th className="px-4 py-3 font-semibold">Checks</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-light">
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-2">
                  No applications match this view.
                </td>
              </tr>
            )}
            {visible.map((i) => {
              const reach = i.platforms.reduce((s, p) => s + (Number(p.followers) || 0), 0)
              const owned = i.platforms.filter((p) => p.ownershipVerified).length
              return (
                <tr key={i.memberId} className="hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={i.photo} name={i.displayName} />
                      <div className="flex min-w-0 flex-col">
                        <span className="font-semibold text-heading">{i.displayName}</span>
                        <span className="truncate text-xs text-muted-2">{i.memberEmail}</span>
                      {i.referralCode ? (
                        <span className="font-mono text-xs text-muted-2">
                          Ref {i.referralCode}
                          {!i.referralActive ? " · paused" : ""}
                        </span>
                      ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <KolStatusPill status={i.status} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-heading">{formatCount(reach)}</td>
                  <td className="px-4 py-3 text-xs text-body">
                    ID {i.identityVerified ? "✓" : "—"} · Metrics {i.metricsVerified ? "✓" : "—"} · Accounts {owned}/
                    {i.platforms.length}
                  </td>
                  <td className="px-4 py-3 text-xs text-body">{formatDate(i.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Edit ${i.displayName}`}
                        onClick={() => {
                          setStartEditing(true)
                          setOpenId(i.memberId)
                        }}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setStartEditing(false)
                          setOpenId(i.memberId)
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {open && <ReviewPanel key={`${open.memberId}-${startEditing}`} row={open} initialEditing={startEditing} />}
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-lg">
          <InvitePanel invitable={invitable} onDone={() => setInviteOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Avatar({ src, name }: { src: string; name: string }) {
  return (
    <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-surface">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center text-muted-2">
          <UserRound className="size-5" aria-hidden="true" />
        </span>
      )}
    </span>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-2">{label}</dt>
      <dd className="whitespace-pre-line text-sm leading-relaxed text-body">{value}</dd>
    </div>
  )
}

function ReviewPanel({ row, initialEditing = false }: { row: AdminKolRow; initialEditing?: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState(initialEditing)
  const [note, setNote] = useState(row.adminNote)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function run(task: () => ReturnType<typeof adminSetKolStatus>) {
    setMsg(null)
    startTransition(async () => {
      const res = await task()
      setMsg(res.ok ? { ok: true, text: res.message || "Updated." } : { ok: false, text: res.error })
      if (res.ok) router.refresh()
    })
  }

  const decide = (status: KolStatus, needsNote?: boolean) => {
    if (needsNote && !note.trim()) {
      setMsg({ ok: false, text: "Add a note for the applicant explaining this decision." })
      return
    }
    run(() => adminSetKolStatus(row.memberId, status, note))
  }

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <Avatar src={row.photo} name={row.displayName} />
          <div className="flex flex-col gap-1 text-left">
            <DialogTitle className="text-heading">{row.displayName}</DialogTitle>
            <DialogDescription>
              {[row.title, row.organization].filter(Boolean).join(", ") || row.memberEmail}
            </DialogDescription>
          </div>
          <div className="ml-auto flex flex-col items-end gap-2 pr-6 sm:flex-row sm:items-center">
            <KolStatusPill status={row.status} />
            {!editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="size-4" aria-hidden="true" />
                Edit profile
              </Button>
            )}
          </div>
        </div>
      </DialogHeader>

      {editing ? (
        <KolAdminEditor row={row} onDone={() => setEditing(false)} />
      ) : (
        <>

      {row.memberStatus !== "active" && (
        <p className="rounded-lg bg-gold-tint px-3 py-2 text-sm text-heading">
          Membership is {row.memberStatus}. The profile stays hidden from the public directory until membership is active.
        </p>
      )}

      <dl className="grid gap-4 md:grid-cols-2">
        <Detail label="Legal name" value={row.fullName} />
        <Detail label="Location" value={[row.city, row.country].filter(Boolean).join(", ")} />
        <Detail label="Expertise" value={row.expertise.join(", ")} />
        <Detail label="Monthly reach" value={row.monthlyReach ? formatCount(row.monthlyReach) : ""} />
  <Detail
    label="Referral code"
    value={
      row.referralCode
        ? `${row.referralCode}${row.referralActive ? " (active)" : " (paused)"}`
        : row.status === "verified"
          ? row.hasLogin
            ? "Generating on next load"
            : "No login account linked"
          : "Issued on verification"
    }
  />
        <div className="md:col-span-2">
          <Detail label="Bio" value={row.bio} />
        </div>
        <Detail label="Media appearances" value={row.mediaAppearances} />
        <Detail label="Collaborations" value={row.collaborations} />
        <Detail label="Achievements" value={row.achievements} />
        <Detail label="Notes for reviewers" value={row.evidenceNotes} />
      </dl>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-heading">
          Accounts <span className="font-normal text-muted-2">· ownership code {row.ownershipCode}</span>
        </h3>
        <ul className="flex flex-col divide-y divide-line-light rounded-xl border border-line-light">
          {row.platforms.map((p, idx) => (
            <li key={idx} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <PlatformIcon platform={p.platform} className="size-8" />
              <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-w-0 flex-1 flex-col">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-heading hover:text-green">
                  {platformLabel(p.platform)}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </span>
                <span className="truncate text-xs text-muted-2">{p.url}</span>
              </a>
              <span className="text-sm font-bold text-heading">{formatCount(Number(p.followers))}</span>
              {p.engagement > 0 && <span className="text-xs text-muted-2">{p.engagement}%</span>}
              <label className="flex items-center gap-2 text-xs text-body">
                <Checkbox
                  checked={p.ownershipVerified}
                  disabled={pending}
                  onCheckedChange={(v) => run(() => adminSetKolCheck(row.memberId, { platformIndex: idx }, v === true))}
                />
                Owner confirmed
              </label>
            </li>
          ))}
          {row.platforms.length === 0 && <li className="px-4 py-3 text-sm text-muted-2">No accounts listed.</li>}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-heading">Evidence</h3>
        {row.evidence.length ? (
          <ul className="flex flex-wrap gap-2">
            {row.evidence.map((e) => (
              <li key={e.key}>
                <a
                  href={`/api/kol/evidence?key=${encodeURIComponent(e.key)}&member=${row.memberId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-heading hover:border-green"
                >
                  <FileText className="size-4 text-muted-2" aria-hidden="true" />
                  {e.name}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-2">No files uploaded.</p>
        )}
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-body">
            <Checkbox
              checked={row.identityVerified}
              disabled={pending}
              onCheckedChange={(v) => run(() => adminSetKolCheck(row.memberId, "identity", v === true))}
            />
            Identity verified
          </label>
          <label className="flex items-center gap-2 text-sm text-body">
            <Checkbox
              checked={row.metricsVerified}
              disabled={pending}
              onCheckedChange={(v) => run(() => adminSetKolCheck(row.memberId, "metrics", v === true))}
            />
            Audience metrics verified
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-surface p-4">
        <Label htmlFor="kol-note">Note to applicant</Label>
        <Textarea
          id="kol-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Required when requesting info, rejecting or revoking. Included in the email."
        />
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green" : "text-destructive"}`}>
            {msg.text}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {DECISIONS.filter((d) => d.status !== row.status).map((d) => (
            <Button
              key={d.status}
              size="sm"
              disabled={pending}
              variant={d.tone === "outline" ? "outline" : d.tone === "danger" ? "destructive" : "default"}
              className={d.tone === "primary" ? "bg-green text-card hover:bg-green-hover" : undefined}
              onClick={() => decide(d.status, d.needsNote)}
            >
              {pending && d.tone === "primary" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {d.label}
            </Button>
          ))}
          {row.status === "verified" && (
            <Link
              href={`/membership/verified-opinion-leaders/${row.slug}`}
              target="_blank"
              className={buttonVariants({ size: "sm", variant: "ghost" })}
            >
              Public profile
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        {row.status === "verified" && (
          <p className="text-xs text-muted-2">
            Verified {formatDate(row.verifiedAt)} · expires {formatDate(row.expiresAt)}
            {row.reviewedBy ? ` · by ${row.reviewedBy}` : ""}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-bold text-heading">History</h3>
        <ol className="flex flex-col gap-2 border-l border-line pl-4">
          {row.audit.map((a) => (
            <li key={a.id} className="text-xs leading-relaxed text-body">
              <span className="font-semibold text-heading">
                {a.toStatus ? `${KOL_STATUS_LABEL[a.toStatus as KolStatus] ?? a.toStatus}` : a.action.replace(/_/g, " ")}
              </span>{" "}
              · {a.actor} · {formatDate(a.createdAt)}
              {a.note && <span className="block text-muted-2">{a.note}</span>}
            </li>
          ))}
          {row.audit.length === 0 && <li className="text-xs text-muted-2">No history yet.</li>}
        </ol>
      </section>
        </>
      )}
    </div>
  )
}

function InvitePanel({ invitable, onDone }: { invitable: Invitable[]; onDone: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<number[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const list = invitable.filter((m) => `${m.name} ${m.email}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 100)

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="text-heading">Invite members to apply</DialogTitle>
        <DialogDescription>Selected active members receive an invitation email with a link to apply.</DialogDescription>
      </DialogHeader>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members" aria-label="Search members" />
      <ul className="flex max-h-72 flex-col divide-y divide-line-light overflow-y-auto rounded-xl border border-line-light">
        {list.map((m) => (
          <li key={m.id}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-surface">
              <Checkbox checked={selected.includes(m.id)} onCheckedChange={() => toggle(m.id)} />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-medium text-heading">{m.name}</span>
                <span className="truncate text-xs text-muted-2">{m.email}</span>
              </span>
            </label>
          </li>
        ))}
        {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-2">No eligible members.</li>}
      </ul>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}
      <Button
        disabled={pending || selected.length === 0}
        className="bg-green text-card hover:bg-green-hover"
        onClick={() =>
          startTransition(async () => {
            const res = await adminInviteKols(selected)
            setMsg(res.ok ? { ok: true, text: res.message || "Invitations sent." } : { ok: false, text: res.error })
            if (res.ok) {
              setSelected([])
              router.refresh()
              setTimeout(onDone, 1200)
            }
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Send {selected.length || ""} invitation{selected.length === 1 ? "" : "s"}
      </Button>
    </div>
  )
}
