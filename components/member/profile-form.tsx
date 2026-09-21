"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera } from "lucide-react"
import { updateProfile } from "@/app/actions/member"

const ASSET_TYPES = [
  { value: "", label: "Select a category…" },
  { value: "ntn", label: "NTN holder (registered taxpayer)" },
  { value: "blockchain", label: "Blockchain industry professional" },
  { value: "virtual-asset", label: "Virtual asset service provider / investor" },
  { value: "other", label: "Other" },
]

type ProfileValues = {
  name: string
  email: string
  image: string
  organization: string
  ntn: string
  designation: string
  phone: string
  linkedin: string
  website: string
  city: string
  bio: string
  assetType: string
}

export function ProfileForm(props: ProfileValues) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [image, setImage] = useState(props.image)
  const fileRef = useRef<HTMLInputElement>(null)

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_500_000) {
      setStatus({ ok: false, msg: "Photo must be smaller than 1.5 MB." })
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImage(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function action(formData: FormData) {
    setSaving(true)
    setStatus(null)
    formData.set("image", image)
    const res = await updateProfile(formData)
    setSaving(false)
    if (res.ok) {
      setStatus({ ok: true, msg: "Profile updated successfully." })
      router.refresh()
    } else {
      setStatus({ ok: false, msg: res.error ?? "Update failed." })
    }
  }

  const initials = props.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <form action={action} className="flex flex-col gap-6">
      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image || "/placeholder.svg"}
              alt="Profile photo"
              className="size-20 rounded-full border border-line object-cover"
            />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-mint text-xl font-bold text-green">
              {initials || "?"}
            </span>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-line bg-green text-white shadow-sm transition-colors hover:bg-green-hover"
            aria-label="Change profile photo"
          >
            <Camera className="size-3.5" />
          </button>
        </div>
        <div>
          <p className="text-sm font-semibold text-heading">Profile photo</p>
          <p className="text-xs text-muted-2">JPG or PNG, up to 1.5 MB.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name">
          <Input name="name" defaultValue={props.name} required />
        </Field>
        <Field label="Email" hint="Contact support to change your account email.">
          <input
            value={props.email}
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-line bg-muted px-3 py-2.5 text-sm text-muted-2"
          />
        </Field>
        <Field label="Organization / company">
          <Input name="organization" defaultValue={props.organization} placeholder="Your company or organization" />
        </Field>
        <Field label="Designation / role">
          <Input name="designation" defaultValue={props.designation} placeholder="e.g. CEO, Compliance Lead" />
        </Field>
        <Field label="NTN (National Tax Number)" hint="Required to register as a voting member.">
          <Input name="ntn" defaultValue={props.ntn} placeholder="0000000-0" />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={props.phone} placeholder="+92 300 0000000" />
        </Field>
        <Field label="LinkedIn">
          <Input name="linkedin" defaultValue={props.linkedin} placeholder="https://linkedin.com/in/…" />
        </Field>
        <Field label="Website">
          <Input name="website" defaultValue={props.website} placeholder="https://…" />
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={props.city} placeholder="Karachi" />
        </Field>
        <Field label="Industry category" hint="Determines your voting registration eligibility.">
          <select
            name="assetType"
            defaultValue={props.assetType}
            className="w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
          >
            {ASSET_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Short bio">
        <textarea
          name="bio"
          defaultValue={props.bio}
          rows={4}
          placeholder="Tell the community about yourself and your work in the virtual asset industry."
          className="w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
        />
      </Field>

      {status && (
        <p className={`text-sm font-medium ${status.ok ? "text-green" : "text-destructive"}`}>{status.msg}</p>
      )}

      <div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-hover disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-heading outline-none focus:border-green focus:ring-2 focus:ring-green/20"
    />
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-heading">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-2">{hint}</span>}
    </label>
  )
}
