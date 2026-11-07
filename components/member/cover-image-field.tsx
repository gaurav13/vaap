"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function CoverImageField({
  value,
  onChange,
  onUpload,
  disabled = false,
}: {
  value: string | null
  onChange: (url: string | null) => void
  onUpload: (file: File) => Promise<string>
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle(file: File | undefined) {
    if (!file || disabled) return
    if (!file.type.startsWith("image/")) {
      setError("Please choose a JPG, PNG, WebP, GIF or AVIF image.")
      return
    }
    setError(null)
    setUploading(true)
    try {
      onChange(await onUpload(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        void handle(file)
      }}
    />
  )

  return (
    <div>
      {value ? (
        <div className="overflow-hidden rounded-lg border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Article cover preview" className="aspect-[16/7] w-full bg-muted object-cover" />
          {!disabled && (
            <div className="flex flex-wrap gap-2 border-t border-line bg-muted/50 p-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-3 py-1.5 text-xs font-semibold text-heading hover:bg-muted disabled:opacity-50"
              >
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void handle(e.dataTransfer.files?.[0])
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-muted/40 px-4 py-8 text-center transition-colors hover:border-green-border hover:bg-mint/40 disabled:cursor-not-allowed disabled:opacity-60",
            dragging && "border-green bg-mint/50",
          )}
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-green" />
          ) : (
            <ImagePlus className="size-6 text-green" />
          )}
          <span className="text-sm font-semibold text-heading">
            {uploading ? "Uploading…" : "Upload a cover picture"}
          </span>
          <span className="text-xs text-muted-2">Click or drag an image here. A wide (landscape) photo works best.</span>
        </button>
      )}
      {picker}
      {error && (
        <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
