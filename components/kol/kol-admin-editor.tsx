"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2, Upload, UserRound, X } from "lucide-react"
import { adminUpdateKolProfile, type KolApplicationInput } from "@/app/actions/kol"
import type { KolPlatform } from "@/lib/db/schema"
import { KOL_EXPERTISE, KOL_PLATFORMS } from "@/lib/kol-shared"
import { postImageUpload } from "@/lib/client-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AdminKolRow } from "@/components/kol/kol-admin-manager"

const selectClass =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function toInput(row: AdminKolRow): KolApplicationInput {
  return {
    fullName: row.fullName,
    professionalName: row.professionalName,
    photo: row.photo,
    country: row.country,
    city: row.city,
    organization: row.organization,
    title: row.title,
    bio: row.bio,
    expertise: row.expertise,
    platforms: row.platforms,
    monthlyReach: row.monthlyReach,
    mediaAppearances: row.mediaAppearances,
    collaborations: row.collaborations,
    achievements: row.achievements,
    collabInterests: row.collabInterests,
    evidenceNotes: row.evidenceNotes,
  }
}

export function KolAdminEditor({ row, onDone }: { row: AdminKolRow; onDone: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState<KolApplicationInput>(() => toInput(row))
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const id = (name: string) => `kol-edit-${row.memberId}-${name}`

  const set = <K extends keyof KolApplicationInput>(key: K, value: KolApplicationInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const setPlatform = (index: number, patch: Partial<KolPlatform>) =>
    set(
      "platforms",
      form.platforms.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    )

  const toggleExpertise = (value: string) =>
    set(
      "expertise",
      form.expertise.includes(value) ? form.expertise.filter((e) => e !== value) : [...form.expertise, value].slice(0, 8),
    )

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setMsg(null)
    setUploading(true)
    try {
      set("photo", await postImageUpload("/api/admin/upload", file, { folder: "kol" }))
    } catch (error) {
      setMsg({ ok: false, text: error instanceof Error ? error.message : "Photo upload failed." })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function save() {
    setMsg(null)
    startTransition(async () => {
      const res = await adminUpdateKolProfile(row.memberId, form)
      if (!res.ok) {
        setMsg({ ok: false, text: res.error })
        return
      }
      router.refresh()
      onDone()
    })
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <Section title="Photo">
        <div className="flex flex-wrap items-center gap-4">
          <span className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface">
            {form.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photo} alt={`${form.fullName || "KOL"} profile photo`} className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-muted-2">
                <UserRound className="size-8" aria-hidden="true" />
              </span>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              id={id("photo")}
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
              {form.photo ? "Replace photo" : "Upload photo"}
            </Button>
            {form.photo && (
              <Button type="button" variant="ghost" size="sm" onClick={() => set("photo", "")}>
                <X className="size-4" aria-hidden="true" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={id("fullName")} label="Full name" required>
            <Input id={id("fullName")} value={form.fullName} maxLength={120} onChange={(e) => set("fullName", e.target.value)} required />
          </Field>
          <Field id={id("professionalName")} label="Display / professional name">
            <Input id={id("professionalName")} value={form.professionalName} maxLength={120} onChange={(e) => set("professionalName", e.target.value)} />
          </Field>
          <Field id={id("title")} label="Position / title">
            <Input id={id("title")} value={form.title} maxLength={160} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field id={id("organization")} label="Organization">
            <Input id={id("organization")} value={form.organization} maxLength={160} onChange={(e) => set("organization", e.target.value)} />
          </Field>
          <Field id={id("city")} label="City">
            <Input id={id("city")} value={form.city} maxLength={80} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field id={id("country")} label="Country">
            <Input id={id("country")} value={form.country} maxLength={80} onChange={(e) => set("country", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Content">
        <Field id={id("bio")} label="Bio" hint={`${form.bio.length}/2000`}>
          <Textarea id={id("bio")} rows={5} value={form.bio} maxLength={2000} onChange={(e) => set("bio", e.target.value)} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-heading">
            Expertise <span className="font-normal text-muted-2">(up to 8)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {KOL_EXPERTISE.map((e) => {
              const on = form.expertise.includes(e)
              return (
                <button
                  key={e}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleExpertise(e)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    on ? "border-green bg-mint text-green" : "border-line bg-card text-body hover:border-green"
                  }`}
                >
                  {e}
                </button>
              )
            })}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={id("media")} label="Media appearances">
            <Textarea id={id("media")} rows={3} value={form.mediaAppearances} maxLength={2000} onChange={(e) => set("mediaAppearances", e.target.value)} />
          </Field>
          <Field id={id("collabs")} label="Collaborations">
            <Textarea id={id("collabs")} rows={3} value={form.collaborations} maxLength={2000} onChange={(e) => set("collaborations", e.target.value)} />
          </Field>
          <Field id={id("achievements")} label="Achievements">
            <Textarea id={id("achievements")} rows={3} value={form.achievements} maxLength={2000} onChange={(e) => set("achievements", e.target.value)} />
          </Field>
          <Field id={id("interests")} label="Collaboration interests">
            <Textarea id={id("interests")} rows={3} value={form.collabInterests} maxLength={1000} onChange={(e) => set("collabInterests", e.target.value)} />
          </Field>
        </div>
        <Field id={id("notes")} label="Notes for reviewers">
          <Textarea id={id("notes")} rows={2} value={form.evidenceNotes} maxLength={2000} onChange={(e) => set("evidenceNotes", e.target.value)} />
        </Field>
      </Section>

      <Section title="Audience & accounts">
        <Field id={id("reach")} label="Monthly reach">
          <Input
            id={id("reach")}
            type="number"
            inputMode="numeric"
            min={0}
            value={form.monthlyReach || ""}
            onChange={(e) => set("monthlyReach", Number(e.target.value) || 0)}
            className="sm:max-w-60"
          />
        </Field>
        <ul className="flex flex-col gap-3">
          {form.platforms.map((p, i) => (
            <li key={i} className="flex flex-col gap-3 rounded-xl border border-line-light p-3">
              <div className="flex items-end gap-2">
                <div className="flex w-36 shrink-0 flex-col gap-1.5">
                  <Label htmlFor={id(`p${i}-platform`)} className="text-xs">Platform</Label>
                  <select
                    id={id(`p${i}-platform`)}
                    value={p.platform}
                    onChange={(e) => setPlatform(i, { platform: e.target.value })}
                    className={selectClass}
                  >
                    {KOL_PLATFORMS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Label htmlFor={id(`p${i}-url`)} className="text-xs">Profile URL</Label>
                  <Input id={id(`p${i}-url`)} type="url" value={p.url} placeholder="https://" onChange={(e) => setPlatform(i, { url: e.target.value })} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove account ${i + 1}`}
                  onClick={() => set("platforms", form.platforms.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <NumberField id={id(`p${i}-followers`)} label="Followers" value={p.followers} onChange={(v) => setPlatform(i, { followers: v })} />
                <NumberField id={id(`p${i}-views`)} label="Avg. views" value={p.avgViews} onChange={(v) => setPlatform(i, { avgViews: v })} />
                <NumberField id={id(`p${i}-eng`)} label="Engagement %" value={p.engagement} max={100} step={0.1} onChange={(v) => setPlatform(i, { engagement: v })} />
              </div>
            </li>
          ))}
        </ul>
        {form.platforms.length < 10 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              set("platforms", [
                ...form.platforms,
                { platform: "linkedin", url: "", followers: 0, avgViews: 0, engagement: 0, ownershipVerified: false },
              ])
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            Add account
          </Button>
        )}
        <p className="text-xs leading-relaxed text-muted-2">
          Changing an account URL resets its ownership confirmation. Accounts without a URL are dropped on save.
        </p>
      </Section>

      <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-col gap-2 border-t border-line bg-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p role={msg?.ok === false ? "alert" : "status"} className={`text-sm ${msg?.ok === false ? "text-destructive" : "text-muted-2"}`}>
          {msg?.text ?? "Edits are logged in the profile history."}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || uploading} className="bg-green text-card hover:bg-green-hover">
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Save changes
          </Button>
        </div>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="border-b border-line-light pb-2 text-xs font-bold uppercase tracking-wide text-muted-2">{title}</h3>
      {children}
    </section>
  )
}

function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        {hint && <span className="text-xs text-muted-2">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function NumberField({
  id,
  label,
  value,
  onChange,
  max,
  step = 1,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  max?: number
  step?: number
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={step}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  )
}
