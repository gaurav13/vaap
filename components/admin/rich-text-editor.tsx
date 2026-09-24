"use client"

import { useEffect, useRef, useState } from "react"
import { Bold, ImagePlus, Italic, Underline, List, ListOrdered, Link2, Eraser, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { uploadPageImageFile } from "@/components/admin/upload-image"

type Props = {
  name: string
  defaultValue?: string
  placeholder?: string
  imageUpload?: boolean
  onBusyChange?: (busy: boolean) => void
}

const BLOCK_OPTIONS = [
  { value: "p", label: "Normal text" },
  { value: "h2", label: "Heading (large)" },
  { value: "h3", label: "Subheading (medium)" },
  { value: "h4", label: "Small heading" },
]

// Lightweight WYSIWYG editor. Stores HTML in a hidden textarea so it posts with
// the surrounding <form>. Uses execCommand for broad browser support.
export function RichTextEditor({ name, defaultValue = "", placeholder, imageUpload = false, onBusyChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)
  const [empty, setEmpty] = useState(!defaultValue)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== defaultValue) {
      editorRef.current.innerHTML = defaultValue
    }
    // Initialize once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function sync() {
    const html = editorRef.current?.innerHTML ?? ""
    const stripped = html.replace(/<br\s*\/?>/gi, "").replace(/<[^>]*>/g, "").trim()
    setEmpty(stripped.length === 0)
    setValue(html)
  }

  function exec(command: string, arg?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    sync()
  }

  function onBlock(e: React.ChangeEvent<HTMLSelectElement>) {
    const tag = e.target.value
    exec("formatBlock", tag === "p" ? "p" : tag.toUpperCase())
    e.target.selectedIndex = 0
  }

  function onLink() {
    const url = window.prompt("Enter URL")
    if (url) exec("createLink", url)
  }

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    setUploading(true)
    onBusyChange?.(true)
    try {
      const url = await uploadPageImageFile(file)
      exec("insertImage", url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.")
    } finally {
      setUploading(false)
      onBusyChange?.(false)
    }
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-line bg-muted/60 px-2 py-1.5">
        <select
          onChange={onBlock}
          defaultValue=""
          className="mr-1 rounded-md border border-line bg-background px-2 py-1 text-xs font-medium text-heading outline-none focus:border-green-border"
          aria-label="Text size"
        >
          <option value="" disabled>
            Text size
          </option>
          {BLOCK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ToolbarButton label="Bold" onClick={() => exec("bold")}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec("italic")}>
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec("underline")}>
          <Underline className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-line" />
        <ToolbarButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Insert link" onClick={onLink}>
          <Link2 className="size-4" />
        </ToolbarButton>
        {imageUpload && (
          <ToolbarButton label="Insert image" onClick={() => imageRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          </ToolbarButton>
        )}
        <span className="mx-1 h-5 w-px bg-line" />
        <ToolbarButton label="Clear formatting" onClick={() => exec("removeFormat")}>
          <Eraser className="size-4" />
        </ToolbarButton>
      </div>

      <div className="relative">
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-3.5 top-3 text-sm text-muted-2">{placeholder}</span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          role="textbox"
          aria-multiline="true"
          aria-label="Content editor"
          className="min-h-40 w-full rounded-b-lg border border-line bg-background px-3.5 py-3 text-sm leading-relaxed text-heading outline-none transition-colors focus:border-green-border focus:ring-2 focus:ring-green/20 [&_a]:text-green [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:font-semibold [&_img]:my-3 [&_img]:max-h-80 [&_img]:w-full [&_img]:rounded-lg [&_img]:object-cover [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6"
        />
      </div>
      {imageUpload && (
        <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={onImage} className="hidden" />
      )}
      {error && (
        <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <textarea name={name} value={value} readOnly hidden />
    </div>
  )
}

// Controlled variant for state-driven forms (no surrounding <form>). Mount it
// with a `key` tied to the record id so it re-initializes when switching records.
export function RichTextField({
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [empty, setEmpty] = useState(!value)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
    // Initialize once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function sync() {
    const html = editorRef.current?.innerHTML ?? ""
    const stripped = html.replace(/<br\s*\/?>/gi, "").replace(/<[^>]*>/g, "").trim()
    setEmpty(stripped.length === 0)
    onChange(html)
  }

  function exec(command: string, arg?: string) {
    if (disabled) return
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    sync()
  }

  function onBlock(e: React.ChangeEvent<HTMLSelectElement>) {
    const tag = e.target.value
    exec("formatBlock", tag === "p" ? "p" : tag.toUpperCase())
    e.target.selectedIndex = 0
  }

  function onLink() {
    const url = window.prompt("Enter URL")
    if (url) exec("createLink", url)
  }

  return (
    <div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-line bg-muted/60 px-2 py-1.5",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <select
          onChange={onBlock}
          defaultValue=""
          disabled={disabled}
          className="mr-1 rounded-md border border-line bg-background px-2 py-1 text-xs font-medium text-heading outline-none focus:border-green-border"
          aria-label="Text size"
        >
          <option value="" disabled>
            Text size
          </option>
          {BLOCK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ToolbarButton label="Bold" onClick={() => exec("bold")}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec("italic")}>
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec("underline")}>
          <Underline className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-line" />
        <ToolbarButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Insert link" onClick={onLink}>
          <Link2 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-line" />
        <ToolbarButton label="Clear formatting" onClick={() => exec("removeFormat")}>
          <Eraser className="size-4" />
        </ToolbarButton>
      </div>

      <div className="relative">
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-3.5 top-3 text-sm text-muted-2">{placeholder}</span>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={sync}
          role="textbox"
          aria-multiline="true"
          aria-label="Content editor"
          className={cn(
            "min-h-64 w-full rounded-b-lg border border-line bg-background px-3.5 py-3 text-sm leading-relaxed text-heading outline-none transition-colors focus:border-green-border focus:ring-2 focus:ring-green/20 [&_a]:text-green [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6",
            disabled && "cursor-not-allowed opacity-60",
          )}
        />
      </div>
    </div>
  )
}

function ToolbarButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-mint hover:text-navy disabled:opacity-50"
    >
      {children}
    </button>
  )
}
