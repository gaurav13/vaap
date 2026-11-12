"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ImagePlus, Loader2, X } from "lucide-react"
import { postImageUpload } from "@/lib/client-image"

type Props = {
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (url: string) => void
  onBusyChange?: (busy: boolean) => void
}

export function PhotoUpload({ name, value, defaultValue = "", onChange, onBusyChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [internal, setInternal] = useState(defaultValue)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const url = value ?? internal

  function update(next: string) {
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError("")
    setUploading(true)
    onBusyChange?.(true)
    try {
      update(await postImageUpload("/api/member/upload", file, { folder: "leadership" }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed.")
    } finally {
      setUploading(false)
      onBusyChange?.(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-line bg-background">
        {url ? (
          <Image src={url || "/placeholder.svg"} alt="Profile photograph preview" fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-2">
            <ImagePlus className="size-6" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-semibold text-heading hover:border-green hover:text-green disabled:opacity-60"
          >
            {uploading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {uploading ? "Uploading…" : url ? "Replace photo" : "Upload photo"}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => update("")}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-2 hover:text-destructive"
            >
              <X className="size-4" aria-hidden="true" /> Remove
            </button>
          )}
        </div>
        <p className="text-xs text-muted-2">Square, professional headshot. JPG, PNG or WebP.</p>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={onPick}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      {name && <input type="hidden" name={name} value={url} />}
    </div>
  )
}
