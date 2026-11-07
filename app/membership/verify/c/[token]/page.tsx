import Link from "next/link"
import type { Metadata } from "next"
import { BadgeCheck, Ban, Clock, ShieldX, type LucideIcon } from "lucide-react"
import { SiteHeaderServer } from "@/components/site-header-server"
import { SiteFooter } from "@/components/site-footer"
import { getHeaderUser } from "@/lib/header-user"
import { getVerification, type VerificationStatus } from "@/lib/certificates"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Certificate Verification | VAAP",
  description: "Official verification record for a Virtual Assets Alliance of Pakistan membership certificate.",
  robots: { index: false, follow: false },
}

const STATUS: Record<
  VerificationStatus,
  { label: string; headline: string; detail: string; icon: LucideIcon; tone: string; ring: string }
> = {
  active: {
    label: "Active",
    headline: "Verified — membership is active",
    detail: "This certificate is authentic and the holder is a current member of VAAP in good standing.",
    icon: BadgeCheck,
    tone: "bg-emerald-50 text-emerald-700",
    ring: "ring-emerald-200",
  },
  expired: {
    label: "Expired",
    headline: "Authentic certificate — membership expired",
    detail: "This certificate was issued by VAAP, but the membership term has ended and has not been renewed.",
    icon: Clock,
    tone: "bg-amber-50 text-amber-700",
    ring: "ring-amber-200",
  },
  suspended: {
    label: "Suspended",
    headline: "Membership suspended",
    detail: "This certificate was issued by VAAP, but the membership is currently suspended and is not in good standing.",
    icon: Ban,
    tone: "bg-red-50 text-red-700",
    ring: "ring-red-200",
  },
  revoked: {
    label: "Revoked",
    headline: "Certificate revoked",
    detail: "This certificate is no longer valid. It has been revoked or replaced by a newer certificate.",
    icon: ShieldX,
    tone: "bg-red-50 text-red-700",
    ring: "ring-red-200",
  },
}

function fmt(d: Date | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

export default async function CertificateVerificationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [user, record] = await Promise.all([getHeaderUser(), getVerification(token)])
  const checkedAt = new Date().toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi",
  })

  return (
    <>
      <SiteHeaderServer user={user} />
      <main className="bg-surface">
        <section className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-14 lg:px-8 lg:py-20">
          <header className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-green">Official Certificate Verification</p>
            <h1 className="text-balance font-serif text-3xl font-bold text-heading md:text-4xl">
              Virtual Assets Alliance of Pakistan
            </h1>
          </header>

          {record ? <VerifiedRecord record={record} /> : <NotFound />}

          <p className="text-pretty text-sm leading-relaxed text-muted-2">
            Status checked live against the VAAP member register on {checkedAt} (PKT). Personal contact details are
            never displayed. Questions about this record?{" "}
            <Link href="/contact" className="font-semibold text-green underline-offset-4 hover:underline">
              Contact VAAP
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

function VerifiedRecord({ record }: { record: NonNullable<Awaited<ReturnType<typeof getVerification>>> }) {
  const s = STATUS[record.status]
  const Icon = s.icon
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className={cn("flex items-start gap-4 p-6 ring-1 ring-inset", s.tone, s.ring)} role="status">
        <Icon className="mt-0.5 size-7 shrink-0" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold">{s.headline}</p>
          <p className="text-pretty text-sm leading-relaxed">{s.detail}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-b border-line px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-2">Certificate holder</p>
        <p className="text-balance font-serif text-2xl font-bold text-heading">{record.name}</p>
        {record.organization && <p className="text-sm text-body">{record.organization}</p>}
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-5 px-6 py-6 sm:grid-cols-2">
        <Field label="Membership ID" value={record.membershipId} mono />
        <Field label="Membership category" value={record.category} />
        <Field label="Certificate issued" value={fmt(record.issuedAt)} />
        <Field label="Valid until" value={fmt(record.expiresAt)} />
        <Field label="Member since" value={fmt(record.memberSince)} />
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-2">Verification status</dt>
          <dd>
            <span className={cn("inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1", s.tone, s.ring)}>
              {s.label}
            </span>
          </dd>
        </div>
        {record.status === "revoked" && record.revokedAt && (
          <Field label="Revoked on" value={fmt(record.revokedAt)} />
        )}
      </dl>
    </article>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-2">{label}</dt>
      <dd className={cn("text-base font-semibold text-heading", mono && "font-mono tracking-wide")}>{value}</dd>
    </div>
  )
}

function NotFound() {
  return (
    <article className="flex items-start gap-4 rounded-2xl border border-line bg-card p-6 shadow-sm" role="status">
      <ShieldX className="mt-0.5 size-7 shrink-0 text-red-600" aria-hidden />
      <div className="flex flex-col gap-2">
        <p className="text-lg font-bold text-heading">No matching certificate found</p>
        <p className="text-pretty text-sm leading-relaxed text-body">
          This verification link does not match any certificate issued by VAAP. The certificate may be forged or the
          link may be incomplete. You can also look up a membership by ID.
        </p>
        <Link
          href="/membership/verify"
          className="mt-2 inline-flex w-fit items-center rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Look up a membership
        </Link>
      </div>
    </article>
  )
}
