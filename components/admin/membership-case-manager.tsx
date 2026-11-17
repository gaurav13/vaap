"use client"

import { useState, useTransition } from "react"
import { Search, Loader2, Mail, Award, CreditCard, History, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  cancelEmailChange,
  getMembershipCase,
  issueMemberCertificate,
  reconcilePayment,
  requestEmailChange,
  resendMembershipConfirmation,
  searchMembershipCases,
  searchStripePayments,
  setMembershipCaseStatus,
  type MembershipCaseDetail,
  type MembershipCaseSummary,
  type StripePaymentInfo,
} from "@/app/actions/membership-admin"
import { CASE_STATUSES, CASE_STATUS_LABEL, type CaseStatus } from "@/lib/membership-case-status"

const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—")

const STATUS_TONE: Record<CaseStatus, string> = {
  pending_payment: "bg-amber-tint text-heading",
  payment_received: "bg-blue-tint text-heading",
  pending_verification: "bg-indigo-tint text-heading",
  approved: "bg-green-light text-green",
  rejected: "bg-warning-bg text-destructive",
  suspended: "bg-gold-tint text-heading",
}

function StatusBadge({ status }: { status: CaseStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}>{CASE_STATUS_LABEL[status]}</span>
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Mail; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-heading">
        <Icon className="size-4 text-green" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <dt className="text-muted-2">{label}</dt>
      <dd className="break-all text-right font-medium text-heading">{value ?? "—"}</dd>
    </div>
  )
}

export function MembershipCaseManager({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [query, setQuery] = useState("")
  const [cases, setCases] = useState<MembershipCaseSummary[] | null>(null)
  const [detail, setDetail] = useState<MembershipCaseDetail | null>(null)
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [pending, start] = useTransition()

  function run(fn: () => Promise<void>) {
    setMessage(null)
    start(async () => {
      try {
        await fn()
      } catch (err) {
        setMessage({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong." })
      }
    })
  }

  function search(e: React.FormEvent) {
    e.preventDefault()
    run(async () => {
      const res = await searchMembershipCases(query)
      if (!res.ok) return setMessage({ tone: "error", text: res.error })
      setCases(res.cases)
      setDetail(null)
    })
  }

  function open(c: { applicationId: number | null; memberId: number | null }) {
    run(async () => {
      const res = await getMembershipCase(c)
      if (!res.ok) return setMessage({ tone: "error", text: res.error })
      setDetail(res.detail)
    })
  }

  function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    if (!detail) return
    const key = { applicationId: detail.summary.applicationId, memberId: detail.summary.memberId }
    run(async () => {
      const res = await fn()
      if (!res.ok) return setMessage({ tone: "error", text: res.error })
      setMessage({ tone: "ok", text: success })
      const fresh = await getMembershipCase(key)
      if (fresh.ok) setDetail(fresh.detail)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row" role="search">
        <Label htmlFor="case-search" className="sr-only">
          Search memberships
        </Label>
        <Input
          id="case-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, email, membership ID, application reference or payment reference"
          className="flex-1"
        />
        <Button type="submit" disabled={pending || query.trim().length < 2}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
          Search
        </Button>
      </form>

      {message && (
        <p role="status" className={`rounded-lg px-4 py-3 text-sm ${message.tone === "ok" ? "bg-green-light text-green" : "bg-warning-bg text-destructive"}`}>
          {message.text}
        </p>
      )}

      {cases && !detail && (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          {cases.length === 0 ? (
            <p className="p-6 text-sm text-muted-2">No matching applications or members.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted-2">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">ID / Reference</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={`${c.applicationId}-${c.memberId}`} className="border-b border-line-light last:border-0">
                    <td className="px-4 py-3 font-medium text-heading">{c.name || "—"}</td>
                    <td className="px-4 py-3 text-body">{c.memberEmail ?? c.applicationEmail ?? c.loginEmail ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-body">{c.membershipId ?? c.reference ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => open(c)} disabled={pending}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {detail && <CaseDetail detail={detail} pending={pending} isSuperAdmin={isSuperAdmin} onBack={() => setDetail(null)} act={act} />}
    </div>
  )
}

function CaseDetail({
  detail,
  pending,
  isSuperAdmin,
  onBack,
  act,
}: {
  detail: MembershipCaseDetail
  pending: boolean
  isSuperAdmin: boolean
  onBack: () => void
  act: (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) => void
}) {
  const { summary, application, member, loginUser, payment, pendingEmailChange } = detail
  const [status, setStatus] = useState<CaseStatus>(summary.status)
  const [newEmail, setNewEmail] = useState("")
  const [payRef, setPayRef] = useState("")
  const [payNote, setPayNote] = useState("")
  const [found, setFound] = useState<StripePaymentInfo[] | null>(null)
  const [, startLookup] = useTransition()

  const emailsDiffer = new Set([application?.email, member?.email, loginUser?.email].filter(Boolean).map((e) => e!.toLowerCase())).size > 1

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="w-fit px-0" onClick={onBack}>
            {"← Back to results"}
          </Button>
          <h2 className="text-balance font-serif text-xl font-bold text-heading">{summary.name || "Unnamed applicant"}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-2">
            <StatusBadge status={summary.status} />
            <span>{summary.category}</span>
            {summary.membershipId && <span className="font-mono">{summary.membershipId}</span>}
          </div>
        </div>
      </div>

      {emailsDiffer && (
        <p className="rounded-lg bg-amber-tint px-4 py-3 text-sm text-heading">
          The application, member record and login account use different email addresses. Use Correct email below to bring them back in line.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Records" icon={History}>
          <dl className="flex flex-col gap-2">
            <Row label="Application ref" value={application?.reference} />
            <Row label="Application email" value={application?.email} />
            <Row label="Member email" value={member?.email} />
            <Row label="Login email" value={loginUser ? `${loginUser.email}${loginUser.emailVerified ? "" : " (unverified)"}` : null} />
            <Row label="Applied" value={fmt(application?.createdAt)} />
            <Row label="Joined" value={fmt(member?.joinedAt)} />
            <Row label="Expires" value={fmt(member?.expiresAt)} />
            <Row label="Certificate" value={detail.certificate ? `${detail.certificate.status}, ${fmt(detail.certificate.issuedAt)}` : "Not issued"} />
          </dl>
        </Section>

        <Section title="Payment" icon={CreditCard}>
          <dl className="flex flex-col gap-2">
            <Row label="Method" value={application?.paymentMethod} />
            <Row label="Reference" value={application?.txid} />
            <Row label="Amount due" value={application?.totalAmount} />
            <Row label="Verified" value={application?.paymentVerifiedAt ? `${fmt(application.paymentVerifiedAt)} by ${application.paymentVerifiedBy}` : "Not verified"} />
            {payment && <Row label="Stripe" value={`${payment.currency} ${payment.amount.toLocaleString()} · ${payment.status} · ${payment.email ?? "no email"}`} />}
          </dl>

          {application && !application.paymentVerifiedAt && (
            <div className="flex flex-col gap-2 border-t border-line-light pt-3">
              <Label htmlFor="pay-ref">Link a payment</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="pay-ref" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Stripe session (cs_…), email or bank reference" />
                <Button
                  type="button"
                  variant="outline"
                  disabled={payRef.trim().length < 3}
                  onClick={() =>
                    startLookup(async () => {
                      const res = await searchStripePayments(payRef)
                      setFound(res.ok ? res.payments : [])
                    })
                  }
                >
                  Find in Stripe
                </Button>
              </div>
              {found && found.length === 0 && <p className="text-sm text-muted-2">No Stripe payments found. You can still record a manual payment.</p>}
              {found?.map((p) => (
                <div key={p.ref} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-light p-3 text-sm">
                  <span className="text-body">
                    {p.currency} {p.amount.toLocaleString()} · {p.email ?? "—"} · {fmt(p.paidAt)}
                  </span>
                  {p.assignedApplicationId ? (
                    <span className="text-xs text-muted-2">Already linked to application #{p.assignedApplicationId}</span>
                  ) : (
                    <Button
                      size="sm"
                      disabled={pending || p.status !== "paid"}
                      onClick={() => act(() => reconcilePayment({ applicationId: application.id, provider: "stripe", paymentRef: p.ref, note: payNote }), "Stripe payment linked.")}
                    >
                      Link
                    </Button>
                  )}
                </div>
              ))}
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Note for the audit log (required for manual payments)" aria-label="Reconciliation note" />
              <Button
                variant="outline"
                disabled={pending || payRef.trim().length < 3 || payNote.trim().length < 5}
                onClick={() => act(() => reconcilePayment({ applicationId: application.id, provider: "manual", paymentRef: payRef.trim(), note: payNote }), "Manual payment recorded.")}
              >
                Record manual payment
              </Button>
            </div>
          )}
        </Section>

        <Section title="Status" icon={RefreshCw}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Label htmlFor="case-status" className="sr-only">
              Membership status
            </Label>
            <select
              id="case-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as CaseStatus)}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CASE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <Button
              disabled={pending || status === summary.status}
              onClick={() => act(() => setMembershipCaseStatus({ applicationId: summary.applicationId, memberId: summary.memberId, status }), `Status changed to ${CASE_STATUS_LABEL[status]}.`)}
            >
              Update status
            </Button>
          </div>
          {member && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={pending} onClick={() => act(() => resendMembershipConfirmation(member.id), "Confirmation email sent.")}>
                <Mail className="size-4" aria-hidden="true" />
                Resend confirmation
              </Button>
              <Button variant="outline" size="sm" disabled={pending} onClick={() => act(() => issueMemberCertificate(member.id), "Certificate issued.")}>
                <Award className="size-4" aria-hidden="true" />
                {detail.certificate ? "Reissue certificate" : "Issue certificate"}
              </Button>
            </div>
          )}
          {detail.confirmationEmails.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-muted-2">
              {detail.confirmationEmails.slice(0, 5).map((e, i) => (
                <li key={i}>
                  {fmt(e.createdAt)} · {e.status} · {e.recipient}
                  {e.error ? ` · ${e.error}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Correct email" icon={Mail}>
          {pendingEmailChange ? (
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-body">
                Waiting for <span className="font-medium text-heading">{pendingEmailChange.newEmail}</span> to confirm (expires {fmt(pendingEmailChange.expiresAt)}). Requested by {pendingEmailChange.requestedByName}.
              </p>
              <Button variant="outline" size="sm" className="w-fit" disabled={pending} onClick={() => act(() => cancelEmailChange(pendingEmailChange.id), "Email change cancelled.")}>
                Cancel request
              </Button>
            </div>
          ) : isSuperAdmin ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-2">A confirmation link goes to the new address. The application, member record and login update together once it is clicked.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Label htmlFor="new-email" className="sr-only">
                  New email
                </Label>
                <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@email.com" />
                <Button
                  disabled={pending || !newEmail.includes("@")}
                  onClick={() => act(() => requestEmailChange({ applicationId: summary.applicationId, memberId: summary.memberId, newEmail }), "Confirmation link sent to the new email.")}
                >
                  Send link
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-2">Only a Super Admin can change a member&apos;s email.</p>
          )}
        </Section>
      </div>

      <Section title="History" icon={History}>
        {detail.history.length === 0 && detail.reconciliations.length === 0 ? (
          <p className="text-sm text-muted-2">No changes recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {detail.reconciliations.map((r) => (
              <li key={`r${r.id}`} className="text-body">
                <span className="text-muted-2">{fmt(r.createdAt)}</span> · {r.actorName} linked {r.provider} payment <span className="font-mono text-xs">{r.paymentRef}</span>
                {r.note ? ` — ${r.note}` : ""}
              </li>
            ))}
            {detail.history.map((h, i) => (
              <li key={i} className="text-body">
                <span className="text-muted-2">{fmt(h.createdAt)}</span> · {h.actorName} ({h.actorRole}) · {h.action}
                {h.details ? ` — ${h.details}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
