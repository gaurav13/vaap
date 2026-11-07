"use client"

import { useId, useRef, useState } from "react"
import { Loader2, Upload, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { uploadPageImageFile } from "@/components/admin/upload-image"

type Props = {
  label: string
  help?: string
  value: string
  onChange: (value: string) => void
  onBusyChange?: (busy: boolean) => void
  previewClassName?: string
}

export function SeoImageField({ label, help, value, onChange, onBusyChange, previewClassName }: Props) {
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    onBusyChange?.(true)
    try {
      onChange(await uploadPageImageFile(file, "pages"))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.")
    } finally {
      setUploading(false)
      onBusyChange?.(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-1.5 md:col-span-2">
      <label htmlFor={id} className="text-sm font-medium text-heading">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id={id} value={value} placeholder="https://… or /images/…" onChange={(e) => onChange(e.target.value)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-mint px-3.5 text-sm font-semibold text-green transition-colors hover:bg-green hover:text-primary-foreground disabled:opacity-60"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          onChange={onPick}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </div>
      {help && <span className="text-xs text-muted-2">{help}</span>}
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {value && (
        <div className="mt-1 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`${label} preview`}
            className={`rounded-lg border border-line bg-surface object-contain ${previewClassName ?? "h-24 w-auto"}`}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 text-xs text-muted-2 hover:text-destructive"
          >
            <X className="size-3.5" aria-hidden /> Remove
          </button>
        </div>
      )}
    </div>
  )
}
