"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { uploadPageImageFile } from "@/components/admin/upload-image"

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif"
const MAX_BYTES = 8 * 1024 * 1024
const RECOMMENDED = { width: 1600, height: 900 }
const MIN = { width: 1200, height: 675 }

function readDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      reject(new Error("That image could not be read."))
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

export function ProposalBannerField({ onUploadingChange }: { onUploadingChange?: (uploading: boolean) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")

  function setBusy(value: boolean) {
    setUploading(value)
    onUploadingChange?.(value)
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError("")
    setWarning("")
    if (!ACCEPT.split(",").includes(file.type)) return setError("Use a JPG, PNG, WebP, or AVIF image.")
    if (file.size > MAX_BYTES) return setError("Image is too large (max 8MB).")

    setBusy(true)
    try {
      const { width, height } = await readDimensions(file)
      if (width < MIN.width || height < MIN.height) {
        setWarning(`This image is ${width}×${height}px. It may look blurry — use at least ${MIN.width}×${MIN.height}px.`)
      } else if (Math.abs(width / height - 16 / 9) > 0.15) {
        setWarning(`This image is ${width}×${height}px. A 16:9 image works best; edges may be cropped.`)
      }
      setUrl(await uploadPageImageFile(file, "governance"))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 block text-sm font-semibold text-heading">
        Banner image <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      <input type="hidden" name="bannerImageUrl" value={url} />

      {url ? (
        <div className="overflow-hidden rounded-xl border border-line bg-background">
          <div className="aspect-video w-full bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Banner preview" className="size-full object-cover" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
            <p className="text-xs text-muted-foreground">Shown in the header of the public proposal page.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-heading hover:border-green hover:text-green disabled:opacity-60"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrl("")
                  setWarning("")
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden="true" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-[16/6] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-background text-center transition-colors hover:border-green disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-green" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-6 text-green" aria-hidden="true" />
          )}
          <span className="text-sm font-semibold text-heading">{uploading ? "Uploading…" : "Upload banner image"}</span>
          <span className="px-4 text-xs text-muted-foreground">
            Recommended {RECOMMENDED.width}×{RECOMMENDED.height}px (16:9), minimum {MIN.width}×{MIN.height}px. JPG,
            PNG, WebP, or AVIF, max 8MB.
          </span>
        </button>
      )}

      <input ref={inputRef} type="file" accept={ACCEPT} onChange={onPick} className="sr-only" tabIndex={-1} aria-label="Banner image file" />

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-heading" htmlFor="bannerAlt">
          Banner description <span className="font-normal text-muted-foreground">(alt text)</span>
        </label>
        <input
          id="bannerAlt"
          name="bannerAlt"
          maxLength={200}
          placeholder="e.g. Members at the 2026 annual general meeting"
          className="w-full rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm text-heading outline-none transition-colors focus:border-green"
        />
        <p className="mt-1 text-xs text-muted-foreground">Describes the image for screen readers. If left empty, the proposal title is used.</p>
      </div>

      <div aria-live="polite">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {warning && !error && <p className="text-sm text-muted-foreground">{warning}</p>}
      </div>
      <p className="text-xs text-muted-foreground">No banner? The default Islamabad image is shown instead.</p>
    </fieldset>
  )
}
