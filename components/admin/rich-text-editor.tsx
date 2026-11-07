"use client"

import { useEffect, useRef, useState } from "react"
import {
  Bold,
  ImagePlus,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Eraser,
  Loader2,
  Heading2,
  Heading3,
  Pilcrow,
  Quote,
  Undo2,
  Redo2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { marked } from "marked"
import { cleanPastedHtml, plainTextToHtml } from "@/lib/paste-clean"
import { looksLikeMarkdown } from "@/lib/rich-text-plain"
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
          onPaste={(e) => {
            if (insertCleanPaste(e)) sync()
          }}
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

function insertCleanPaste(e: React.ClipboardEvent<HTMLDivElement>) {
  const html = e.clipboardData.getData("text/html")
  const text = e.clipboardData.getData("text/plain")
  if (!html && !text) return false
  e.preventDefault()
  const clean = pasteToHtml(html, text)
  if (clean) document.execCommand("insertHTML", false, clean)
  return true
}

// ChatGPT's copy button, Notion and many chat apps put only Markdown on the
// clipboard; some apps also add an HTML version that is just the raw Markdown
// wrapped in <p>/<pre>, which would leave the ** and # symbols visible.
function pasteToHtml(html: string, text: string) {
  const htmlHasStructure = /<(h[1-6]|ul|ol|li|strong|b|em|i|a|table|blockquote)\b/i.test(html)
  if (text && looksLikeMarkdown(text) && !htmlHasStructure) {
    return cleanPastedHtml(marked.parse(text, { async: false, gfm: true, breaks: true }))
  }
  return html ? cleanPastedHtml(html) : plainTextToHtml(text)
}

function firstImageFile(list: DataTransfer | null) {
  if (!list) return null
  return Array.from(list.files).find((f) => f.type.startsWith("image/")) ?? null
}

function currentBlockTag() {
  const sel = window.getSelection()
  let node: Node | null = sel?.anchorNode ?? null
  while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode
  const el = (node as Element | null)?.closest("h2, h3, h4, blockquote, p, li")
  return el?.tagName.toLowerCase() ?? "p"
}

// Controlled variant for state-driven forms (no surrounding <form>). Mount it
// with a `key` tied to the record id so it re-initializes when switching records.
export function RichTextField({
  value,
  onChange,
  placeholder,
  disabled = false,
  onUploadImage,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  onUploadImage?: (file: File) => Promise<string>
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const savedRange = useRef<Range | null>(null)
  const [empty, setEmpty] = useState(!value)
  const [block, setBlock] = useState("p")
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setEmpty(stripped.length === 0 && !/<img/i.test(html))
    onChange(html)
  }

  function rememberSelection() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange()
      setBlock(currentBlockTag())
    }
  }

  function restoreSelection() {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const range = savedRange.current
    if (range && editor.contains(range.startContainer)) {
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }

  function exec(command: string, arg?: string) {
    if (disabled) return
    restoreSelection()
    document.execCommand(command, false, arg)
    rememberSelection()
    sync()
  }

  function setBlockTag(tag: string) {
    const next = block === tag && tag !== "p" ? "p" : tag
    exec("formatBlock", next === "blockquote" ? "BLOCKQUOTE" : next.toUpperCase())
  }

  function onLink() {
    rememberSelection()
    const url = window.prompt("Link address (https://…)")
    if (!url) return
    const href = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`
    exec("createLink", href)
  }

  async function insertImage(file: File) {
    if (!onUploadImage) return
    setError(null)
    setUploading(true)
    try {
      const url = await onUploadImage(file)
      exec("insertHTML", `<img src="${url.replace(/"/g, "&quot;")}" alt=""><p><br></p>`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.")
    } finally {
      setUploading(false)
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    if (disabled) return
    const image = firstImageFile(e.clipboardData)
    const html = e.clipboardData.getData("text/html")
    if (image && onUploadImage && !html) {
      e.preventDefault()
      rememberSelection()
      void insertImage(image)
      return
    }
    if (insertCleanPaste(e)) sync()
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    setDragging(false)
    const image = firstImageFile(e.dataTransfer)
    if (!image || !onUploadImage || disabled) return
    e.preventDefault()
    const pos = document.caretRangeFromPoint?.(e.clientX, e.clientY)
    if (pos) savedRange.current = pos
    void insertImage(image)
  }

  return (
    <div>
      <div
        className={cn(
          "sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-line bg-muted px-2 py-1.5",
          disabled && "pointer-events-none opacity-50",
        )}
        role="toolbar"
        aria-label="Formatting"
      >
        <ToolbarButton label="Normal paragraph" active={block === "p"} onClick={() => setBlockTag("p")}>
          <Pilcrow className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Heading" active={block === "h2"} onClick={() => setBlockTag("h2")}>
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Subheading" active={block === "h3"} onClick={() => setBlockTag("h3")}>
          <Heading3 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Quote" active={block === "blockquote"} onClick={() => setBlockTag("blockquote")}>
          <Quote className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-line" />
        <ToolbarButton label="Bold (Ctrl+B)" onClick={() => exec("bold")}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic (Ctrl+I)" onClick={() => exec("italic")}>
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Underline (Ctrl+U)" onClick={() => exec("underline")}>
          <Underline className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-line" />
        <ToolbarButton label="Bullet list" active={block === "li"} onClick={() => exec("insertUnorderedList")}>
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Insert link" onClick={onLink}>
          <Link2 className="size-4" />
        </ToolbarButton>
        {onUploadImage && (
          <ToolbarButton
            label="Insert image"
            disabled={uploading}
            onClick={() => {
              rememberSelection()
              imageRef.current?.click()
            }}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          </ToolbarButton>
        )}
        <span className="mx-1 h-5 w-px bg-line" />
        <ToolbarButton label="Undo (Ctrl+Z)" onClick={() => exec("undo")}>
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Redo (Ctrl+Y)" onClick={() => exec("redo")}>
          <Redo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Clear formatting" onClick={() => exec("removeFormat")}>
          <Eraser className="size-4" />
        </ToolbarButton>
      </div>

      <div className="relative">
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-4 top-4 text-base text-muted-2">{placeholder}</span>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={sync}
          onPaste={onPaste}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onBlur={rememberSelection}
          onDragOver={(e) => {
            if (onUploadImage && Array.from(e.dataTransfer.types).includes("Files")) {
              e.preventDefault()
              setDragging(true)
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          role="textbox"
          aria-multiline="true"
          aria-label="Article content"
          className={cn(
            "min-h-80 max-h-[70vh] w-full overflow-y-auto rounded-b-lg border border-line bg-background px-4 py-4 text-base leading-relaxed text-heading outline-none transition-colors focus:border-green-border focus:ring-2 focus:ring-green/20",
            "[&_a]:text-green [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-green [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-2",
            "[&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-snug [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:font-semibold",
            "[&_img]:my-4 [&_img]:max-h-[28rem] [&_img]:w-full [&_img]:rounded-lg [&_img]:object-contain [&_li]:mb-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6",
            dragging && "border-green bg-mint/40",
            disabled && "cursor-not-allowed opacity-60",
          )}
        />
      </div>
      {onUploadImage && (
        <input
          ref={imageRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) void insertImage(file)
          }}
          className="hidden"
        />
      )}
      {error && (
        <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {!disabled && (
        <p className="mt-2 text-xs leading-relaxed text-muted-2">
          Paste straight from ChatGPT, Word or Google Docs: headings, bold, lists and links are kept, Markdown symbols like ** and
          # are converted, and fonts and colours are tidied up.{onUploadImage ? " To add a picture, use the image button or drag one into the text." : ""}
        </p>
      )}
    </div>
  )
}

function ToolbarButton({
  label,
  onClick,
  disabled = false,
  active,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
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
      aria-pressed={active}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-mint hover:text-navy disabled:opacity-50",
        active && "bg-mint text-green",
      )}
    >
      {children}
    </button>
  )
}
