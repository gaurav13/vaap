"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ImagePlus, Loader2, X } from "lucide-react"
import { postImageUpload } from "@/lib/client-image"

type Props = {
  name: string
  onBusyChange?: (busy: boolean) => void
}

export function EventBannerUpload({ name, onBusyChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    onBusyChange?.(true)
    try {
      setUrl(await postImageUpload("/api/member/upload", file))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.")
    } finally {
      setUploading(false)
      onBusyChange?.(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="grid gap-2">
      {url ? (
        <div className="relative aspect-[16/9] w-full max-w-md overflow-hidden rounded-lg border border-line">
          <Image src={url || "/placeholder.svg"} alt="Event banner preview" fill sizes="448px" className="object-cover" />
          <button
            type="button"
            onClick={() => setUrl("")}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-xs font-semibold text-heading shadow"
          >
            <X className="size-3.5" aria-hidden="true" /> Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-background px-4 py-8 text-sm text-muted-2 transition hover:border-green hover:text-green disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-6" aria-hidden="true" />
          )}
          <span className="font-semibold">{uploading ? "Uploading…" : "Upload banner image"}</span>
          <span className="text-xs">JPG, PNG, WebP, GIF or AVIF · up to 8MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={onPick}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <input type="hidden" name={name} value={url} />
    </div>
  )
}
