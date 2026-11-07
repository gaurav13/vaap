"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ExternalLink, FileText, Loader2, Plus, Trash2, Upload, UserRound } from "lucide-react"
import {
  addKolEvidence,
  removeKolEvidence,
  saveKolApplication,
  updateKolStats,
  type KolApplicationInput,
} from "@/app/actions/kol"
import type { KolEvidence, KolPlatform } from "@/lib/db/schema"
import { KOL_EDITABLE, KOL_EXPERTISE, KOL_PLATFORMS, formatDate, type KolStatus } from "@/lib/kol-shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { KolStatusPill, PlatformIcon, VerifiedBadge } from "@/components/kol/kol-ui"

export type WorkspaceProfile = KolApplicationInput & {
  slug: string
  status: KolStatus
  adminNote: string
  evidence: KolEvidence[]
  submittedAt: string | null
  verifiedAt: string | null
  expiresAt: string | null
}

const blankPlatform = (): KolPlatform => ({
  platform: "linkedin",
  url: "",
  followers: 0,
  avgViews: 0,
  engagement: 0,
  ownershipVerified: false,
})

async function uploadFile(file: File, kind: "photo" | "evidence") {
  const body = new FormData()
  body.append("file", file)
  body.append("kind", kind)
  const res = await fetch("/api/kol/upload", { method: "POST", body })
  const data = (await res.json().catch(() => ({}))) as { url?: string; key?: string; error?: string }
  if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.")
  return data
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-line bg-card p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-heading">{title}</h2>
        {description && <p className="text-sm leading-relaxed text-muted-2">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-2">{hint}</p>}
    </div>
  )
}

function PlatformRows({
  platforms,
  onChange,
  disabled,
}: {
  platforms: KolPlatform[]
  onChange: (next: KolPlatform[]) => void
  disabled?: boolean
}) {
  const update = (i: number, patch: Partial<KolPlatform>) =>
    onChange(platforms.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  return (
    <div className="flex flex-col gap-3">
      {platforms.map((p, i) => (
        <fieldset key={i} className="grid gap-3 rounded-xl border border-line-light bg-surface p-4 md:grid-cols-12" disabled={disabled}>
          <legend className="sr-only">Platform {i + 1}</legend>
          <div className="flex flex-col gap-2 md:col-span-3">
            <Label htmlFor={`pf-${i}`}>Platform</Label>
            <div className="flex items-center gap-2">
              <PlatformIcon platform={p.platform} className="size-8" />
              <select
                id={`pf-${i}`}
                value={p.platform}
                onChange={(e) => update(i, { platform: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
              >
                {KOL_PLATFORMS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor={`pu-${i}`}>Profile URL</Label>
            <Input id={`pu-${i}`} type="url" placeholder="https://" value={p.url} onChange={(e) => update(i, { url: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor={`pn-${i}`}>Followers</Label>
            <Input id={`pn-${i}`} type="number" min={0} inputMode="numeric" value={p.followers || ""} onChange={(e) => update(i, { followers: Number(e.target.value) })} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor={`pe-${i}`}>Engagement %</Label>
            <Input id={`pe-${i}`} type="number" min={0} max={100} step="0.1" value={p.engagement || ""} onChange={(e) => update(i, { engagement: Number(e.target.value) })} />
          </div>
          <div className="flex items-end md:col-span-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(platforms.filter((_, idx) => idx !== i))}
              aria-label={`Remove platform ${i + 1}`}
              className="text-muted-2 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </fieldset>
      ))}
      {!disabled && platforms.length < 10 && (
        <Button type="button" variant="outline" onClick={() => onChange([...platforms, blankPlatform()])} className="self-start">
          <Plus className="size-4" aria-hidden="true" />
          Add platform
        </Button>
      )}
    </div>
  )
}

export function KolWorkspace({ profile, ownershipCode }: { profile: WorkspaceProfile; ownershipCode: string }) {
  const router = useRouter()
  const editable = KOL_EDITABLE.includes(profile.status)
  const [form, setForm] = useState<KolApplicationInput>(() => ({
    fullName: profile.fullName,
    professionalName: profile.professionalName,
    photo: profile.photo,
    country: profile.country,
    city: profile.city,
    organization: profile.organization,
    title: profile.title,
    bio: profile.bio,
    expertise: profile.expertise,
    platforms: profile.platforms.length ? profile.platforms : [blankPlatform()],
    monthlyReach: profile.monthlyReach,
    mediaAppearances: profile.mediaAppearances,
    collaborations: profile.collaborations,
    achievements: profile.achievements,
    collabInterests: profile.collabInterests,
    evidenceNotes: profile.evidenceNotes,
  }))
  const [stats, setStats] = useState({ platforms: profile.platforms, monthlyReach: profile.monthlyReach })
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [uploading, setUploading] = useState<"photo" | "evidence" | null>(null)
  const [pending, startTransition] = useTransition()

  const set = <K extends keyof KolApplicationInput>(key: K, value: KolApplicationInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  function run(task: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) {
    setFeedback(null)
    startTransition(async () => {
      const res = await task()
      setFeedback(res.ok ? { ok: true, text: res.message || "Saved." } : { ok: false, text: res.error })
      if (res.ok) router.refresh()
    })
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setUploading("photo")
    try {
      const { url } = await uploadFile(file, "photo")
      set("photo", url!)
    } catch (e) {
      setFeedback({ ok: false, text: e instanceof Error ? e.message : "Upload failed." })
    } finally {
      setUploading(null)
    }
  }

  async function onEvidence(file: File | undefined) {
    if (!file) return
    setUploading("evidence")
    try {
      const { key } = await uploadFile(file, "evidence")
      run(() => addKolEvidence({ key: key!, name: file.name }))
    } catch (e) {
      setFeedback({ ok: false, text: e instanceof Error ? e.message : "Upload failed." })
    } finally {
      setUploading(null)
    }
  }

  const toggleExpertise = (value: string) =>
    set("expertise", form.expertise.includes(value) ? form.expertise.filter((e) => e !== value) : [...form.expertise, value])

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-navy-dark p-5 text-card md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <KolStatusPill status={profile.status} />
            {profile.status === "verified" && <VerifiedBadge />}
          </div>
          <p className="text-sm leading-relaxed text-card/80">
            {profile.status === "verified"
              ? `Verified on ${formatDate(profile.verifiedAt)} · valid until ${formatDate(profile.expiresAt)}`
              : profile.submittedAt
                ? `Last submitted ${formatDate(profile.submittedAt)}`
                : "Complete your application and submit it for review."}
          </p>
        </div>
        {profile.status === "verified" && (
          <Link
            href={`/membership/verified-opinion-leaders/${profile.slug}`}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-green px-4 py-2 text-sm font-semibold text-card hover:bg-green-hover"
          >
            View public profile
            <ExternalLink className="size-4" aria-hidden="true" />
          </Link>
        )}
      </section>

      {profile.adminNote && ["info_required", "rejected", "revoked"].includes(profile.status) && (
        <div className="flex items-start gap-3 rounded-xl border border-gold bg-gold-tint p-4 text-sm text-heading" role="note">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Message from the review team</p>
            <p className="whitespace-pre-line leading-relaxed text-body">{profile.adminNote}</p>
          </div>
        </div>
      )}

      {feedback && (
        <p
          role={feedback.ok ? "status" : "alert"}
          className={`rounded-lg px-4 py-3 text-sm ${feedback.ok ? "bg-mint text-green" : "bg-destructive/10 text-destructive"}`}
        >
          {feedback.text}
        </p>
      )}

      {profile.status === "verified" && (
        <Card title="Update your audience statistics" description="Keep your reach current. Updated numbers appear on your public profile.">
          <PlatformRows platforms={stats.platforms} onChange={(platforms) => setStats((s) => ({ ...s, platforms }))} />
          <Field id="stats-reach" label="Estimated monthly reach">
            <Input
              id="stats-reach"
              type="number"
              min={0}
              value={stats.monthlyReach || ""}
              onChange={(e) => setStats((s) => ({ ...s, monthlyReach: Number(e.target.value) }))}
              className="max-w-xs"
            />
          </Field>
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(() => updateKolStats(stats.platforms, stats.monthlyReach))}
            className="self-start bg-green text-card hover:bg-green-hover"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Save statistics
          </Button>
        </Card>
      )}

      <fieldset disabled={!editable || pending} className="flex flex-col gap-6">
        <legend className="sr-only">KOL application</legend>
        <Card title="Profile" description="How you will appear in the Verified Opinion Leaders directory.">
          <div className="flex items-center gap-4">
            <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-surface">
              {form.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photo} alt="Your profile photo" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-muted-2">
                  <UserRound className="size-8" aria-hidden="true" />
                </span>
              )}
            </div>
            {editable && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-heading hover:bg-surface focus-within:ring-2 focus-within:ring-ring">
                {uploading === "photo" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
                {form.photo ? "Change photo" : "Upload photo"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
              </label>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="k-full" label="Full legal name">
              <Input id="k-full" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
            </Field>
            <Field id="k-pro" label="Professional / display name" hint="Shown publicly. Leave blank to use your full name.">
              <Input id="k-pro" value={form.professionalName} onChange={(e) => set("professionalName", e.target.value)} />
            </Field>
            <Field id="k-title" label="Title">
              <Input id="k-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Country Manager" />
            </Field>
            <Field id="k-org" label="Organization">
              <Input id="k-org" value={form.organization} onChange={(e) => set("organization", e.target.value)} />
            </Field>
            <Field id="k-city" label="City">
              <Input id="k-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field id="k-country" label="Country">
              <Input id="k-country" value={form.country} onChange={(e) => set("country", e.target.value)} />
            </Field>
          </div>
          <Field id="k-bio" label="Professional bio">
            <Textarea id="k-bio" rows={5} value={form.bio} onChange={(e) => set("bio", e.target.value)} maxLength={3000} />
          </Field>
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-heading">Areas of expertise</legend>
            <div className="flex flex-wrap gap-2">
              {KOL_EXPERTISE.map((e) => {
                const on = form.expertise.includes(e)
                return (
                  <button
                    key={e}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleExpertise(e)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                      on ? "border-green bg-green text-card" : "border-line bg-card text-body hover:border-green"
                    }`}
                  >
                    {e}
                  </button>
                )
              })}
            </div>
          </fieldset>
        </Card>

        <Card
          title="Social platforms & audience"
          description="Add each channel you want verified. Reviewers check ownership and follower counts."
        >
          <PlatformRows platforms={form.platforms} onChange={(p) => set("platforms", p)} disabled={!editable} />
          <Field id="k-reach" label="Estimated monthly reach across platforms">
            <Input
              id="k-reach"
              type="number"
              min={0}
              value={form.monthlyReach || ""}
              onChange={(e) => set("monthlyReach", Number(e.target.value))}
              className="max-w-xs"
            />
          </Field>
          <div className="flex flex-col gap-1 rounded-xl bg-mint p-4 text-sm text-heading">
            <p className="font-semibold">Ownership code: <span className="font-mono text-green">{ownershipCode}</span></p>
            <p className="leading-relaxed text-body">
              Temporarily add this code to the bio of each listed account so reviewers can confirm you own it.
            </p>
          </div>
        </Card>

        <Card title="Track record" description="Optional, but strong applications usually include these.">
          <Field id="k-media" label="Media appearances, talks & interviews">
            <Textarea id="k-media" rows={3} value={form.mediaAppearances} onChange={(e) => set("mediaAppearances", e.target.value)} />
          </Field>
          <Field id="k-collab" label="Previous brand collaborations">
            <Textarea id="k-collab" rows={3} value={form.collaborations} onChange={(e) => set("collaborations", e.target.value)} />
          </Field>
          <Field id="k-ach" label="Achievements & awards">
            <Textarea id="k-ach" rows={3} value={form.achievements} onChange={(e) => set("achievements", e.target.value)} />
          </Field>
          <Field id="k-interest" label="Collaboration interests" hint="Shown publicly on your profile.">
            <Textarea id="k-interest" rows={2} value={form.collabInterests} onChange={(e) => set("collabInterests", e.target.value)} />
          </Field>
        </Card>
      </fieldset>

      <Card
        title="Supporting evidence"
        description="Analytics screenshots or a CNIC/passport copy. Files are private and visible only to you and VAAP reviewers."
      >
        {profile.evidence.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line-light rounded-xl border border-line-light">
            {profile.evidence.map((e) => (
              <li key={e.key} className="flex items-center gap-3 px-4 py-3">
                <FileText className="size-4 shrink-0 text-muted-2" aria-hidden="true" />
                <a
                  href={`/api/kol/evidence?key=${encodeURIComponent(e.key)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm font-medium text-heading hover:text-green"
                >
                  {e.name}
                </a>
                <span className="hidden text-xs text-muted-2 sm:inline">{formatDate(e.uploadedAt)}</span>
                {editable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    onClick={() => run(() => removeKolEvidence(e.key))}
                    aria-label={`Remove ${e.name}`}
                    className="text-muted-2 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-2">No files uploaded yet.</p>
        )}
        {editable && (
          <>
            <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-lg border border-line px-3 py-2 text-sm font-medium text-heading hover:bg-surface focus-within:ring-2 focus-within:ring-ring">
              {uploading === "evidence" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
              Upload file (PDF or image)
              <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => onEvidence(e.target.files?.[0])} />
            </label>
            <Field id="k-notes" label="Notes for reviewers">
              <Textarea id="k-notes" rows={2} value={form.evidenceNotes} onChange={(e) => set("evidenceNotes", e.target.value)} />
            </Field>
          </>
        )}
      </Card>

      {editable && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => saveKolApplication(form, false))}>
            Save draft
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(() => saveKolApplication(form, true))}
            className="bg-green text-card hover:bg-green-hover"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Submit for verification
          </Button>
        </div>
      )}
    </div>
  )
}
