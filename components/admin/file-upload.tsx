"use client"

import { useRef, useState } from "react"
import { Loader2, Upload, X, FileText, LinkIcon } from "lucide-react"
import { uploadPageImageFile } from "@/components/admin/upload-image"

type Props = {
  name: string
  kind: "image" | "file"
  defaultValue?: string
  required?: boolean
  // Pages store images in DigitalOcean Spaces and keep the public URL.
  storage?: "inline" | "spaces"
  folder?: "pages" | "news" | "articles" | "events" | "publications"
  onBusyChange?: (busy: boolean) => void
}

// Uploads a file by encoding it as a data URL stored in a hidden input, so it
// works without external Blob storage. Also accepts a pasted URL as an
// alternative. Large files are rejected to keep the encoded payload reasonable.
const MAX_BYTES = 3 * 1024 * 1024 // 3MB

export function FileUpload({ name, kind, defaultValue = "", required, storage = "inline", folder = "pages", onBusyChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [mode, setMode] = useState<"upload" | "url">(
    defaultValue.startsWith("data:") || (folder === "publications" && !defaultValue) ? "upload" : "url",
  )
  const remote = storage === "spaces"

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (!remote && file.size > MAX_BYTES) {
      setError("File is too large (max 3MB).")
      return
    }
    if (remote) {
      setUploading(true)
      onBusyChange?.(true)
      try {
        const url = await uploadPageImageFile(file, folder)
        setValue(url)
        setFileName(file.name)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Image upload failed.")
      } finally {
        setUploading(false)
        onBusyChange?.(false)
        if (inputRef.current) inputRef.current.value = ""
      }
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setValue(String(reader.result))
      setFileName(file.name)
    }
    reader.readAsDataURL(file)
  }

  function clear() {
    setValue("")
    setFileName("")
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const isImage = kind === "image"
  const hasValue = value.length > 0

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex gap-1">
        <ModeTab active={mode === "upload"} onClick={() => setMode("upload")} icon={<Upload className="size-3.5" />}>
          Upload
        </ModeTab>
        <ModeTab active={mode === "url"} onClick={() => setMode("url")} icon={<LinkIcon className="size-3.5" />}>
          Use URL
        </ModeTab>
      </div>

      {mode === "upload" ? (
        <div className="rounded-lg border border-dashed border-line bg-background p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-mint px-3.5 py-2 text-sm font-semibold text-green transition-colors hover:bg-green hover:text-white disabled:opacity-60"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? "Uploading…" : `Choose ${isImage ? "image" : "document"}`}
            </button>
            {hasValue && (
              <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs text-muted-2 hover:text-destructive">
                <X className="size-3.5" /> Remove
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={isImage ? "image/*" : remote ? ".pdf,application/pdf" : ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"}
            onChange={onPick}
            className="hidden"
          />
          <p className="mt-2 text-xs text-muted-2">
            {remote
              ? isImage
                ? "JPEG, PNG, WebP, GIF, or AVIF. Max 8MB. Saved to DigitalOcean Spaces."
                : "PDF. Max 20MB. Saved to DigitalOcean Spaces."
              : "Max 3MB. Stored inline."}
          </p>
        </div>
      ) : (
        <input
          type="text"
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isImage ? "https://…/image.png" : "https://…/document.pdf"}
          className="w-full rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm text-heading outline-none transition-colors focus:border-green-border focus:ring-2 focus:ring-green/20"
        />
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {hasValue && (
        <div className="mt-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value || "/placeholder.svg"} alt="Preview" className="h-24 w-auto rounded-lg border border-line object-cover" />
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-xs font-medium text-heading">
              <FileText className="size-4 text-green" />
              {fileName || (value.startsWith("data:") ? "Uploaded document" : value)}
            </span>
          )}
        </div>
      )}

      <input type="hidden" name={name} value={value} required={required} />
    </div>
  )
}

function ModeTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
        active ? "bg-green text-white" : "bg-muted text-muted-2 hover:text-navy"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
