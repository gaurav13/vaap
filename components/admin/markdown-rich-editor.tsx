"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Bold, Eraser, Heading2, Heading3, Italic, Link2, List, ListOrdered, Pilcrow, Redo2, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { pasteToHtml, ToolbarButton } from "@/components/admin/rich-text-editor"
import { renderSafeMarkdown } from "@/lib/markdown-safe"
import { htmlToMarkdown } from "@/lib/html-to-markdown"
import { MarkdownView } from "@/components/markdown-view"

type Props = {
  name: string
  id?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  minLength?: number
  maxLength?: number
  label?: string
  previewNote?: string
}

const EDITOR_STYLES =
  "min-h-48 max-h-[60vh] w-full overflow-y-auto rounded-b-lg border border-line bg-background px-4 py-3 text-sm leading-relaxed text-heading outline-none transition-colors focus:border-green-border focus:ring-2 focus:ring-green/20 " +
  "[&_a]:text-green [&_a]:underline [&_blockquote]:border-s-2 [&_blockquote]:border-green [&_blockquote]:ps-3 [&_blockquote]:italic " +
  "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:font-semibold " +
  "[&_li]:mb-1 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:mb-2 [&_strong]:font-semibold [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:ps-6"

/**
 * WYSIWYG editor that saves clean Markdown, for content the AI assistant reads.
 * Pasted Markdown (e.g. from ChatGPT) shows as formatted text, never as symbols.
 */
export function MarkdownRichEditor({
  name,
  id,
  defaultValue = "",
  placeholder,
  required,
  minLength,
  maxLength,
  label = "Content editor",
  previewNote = "This is how members will see it in Ask VAAP AI.",
}: Props) {
  const autoId = useId()
  const editorId = id ?? autoId
  const editorRef = useRef<HTMLDivElement>(null)
  const [markdown, setMarkdown] = useState(defaultValue)
  const [mode, setMode] = useState<"write" | "preview">("write")
  const [empty, setEmpty] = useState(!defaultValue.trim())

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = renderSafeMarkdown(defaultValue)
    // Initialize once on mount; the editor owns its DOM afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function sync() {
    const html = editorRef.current?.innerHTML ?? ""
    const next = htmlToMarkdown(html)
    setEmpty(!next)
    setMarkdown(next)
  }

  function exec(command: string, arg?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    sync()
  }

  function onLink() {
    const url = window.prompt("Link address (https://… or /page)")
    if (!url) return
    exec("createLink", /^(https?:|mailto:|\/)/i.test(url) ? url : `https://${url}`)
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const html = e.clipboardData.getData("text/html")
    const text = e.clipboardData.getData("text/plain")
    if (!html && !text) return
    e.preventDefault()
    const clean = pasteToHtml(html, text)
    if (clean) document.execCommand("insertHTML", false, clean)
    sync()
  }

  const tooShort = minLength ? markdown.length < minLength : false

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg border border-b-0 border-line bg-muted px-2 py-1.5">
          <div
            role="toolbar"
            aria-label="Formatting"
            className={cn("flex flex-wrap items-center gap-1", mode === "preview" && "pointer-events-none opacity-40")}
          >
            <ToolbarButton label="Normal paragraph" onClick={() => exec("formatBlock", "P")}>
              <Pilcrow className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Heading" onClick={() => exec("formatBlock", "H2")}>
              <Heading2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Subheading" onClick={() => exec("formatBlock", "H3")}>
              <Heading3 className="size-4" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            <ToolbarButton label="Bold (Ctrl+B)" onClick={() => exec("bold")}>
              <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Italic (Ctrl+I)" onClick={() => exec("italic")}>
              <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
              <List className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
              <ListOrdered className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Insert link" onClick={onLink}>
              <Link2 className="size-4" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            <ToolbarButton label="Undo" onClick={() => exec("undo")}>
              <Undo2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Redo" onClick={() => exec("redo")}>
              <Redo2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Clear formatting" onClick={() => exec("removeFormat")}>
              <Eraser className="size-4" />
            </ToolbarButton>
          </div>
          <div role="tablist" aria-label="Editor mode" className="flex rounded-md border border-line bg-background p-0.5 text-xs font-semibold">
            {(["write", "preview"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded px-3 py-1 capitalize transition-colors",
                  mode === m ? "bg-green text-primary-foreground" : "text-muted-2 hover:text-heading",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className={cn("relative", mode === "preview" && "hidden")}>
          {empty && placeholder ? (
            <span className="pointer-events-none absolute start-4 top-3 text-sm text-muted-2">{placeholder}</span>
          ) : null}
          <div
            ref={editorRef}
            id={editorId}
            contentEditable
            suppressContentEditableWarning
            onInput={sync}
            onPaste={onPaste}
            role="textbox"
            aria-multiline="true"
            aria-label={label}
            className={EDITOR_STYLES}
          />
        </div>

        {mode === "preview" ? (
          <div className="min-h-48 rounded-b-lg border border-line bg-card px-4 py-3">
            <p className="mb-3 text-xs font-medium text-muted-2">{previewNote}</p>
            <div className="max-w-xl rounded-2xl rounded-ss-sm bg-muted px-4 py-3 text-body">
              {markdown ? <MarkdownView text={markdown} /> : <p className="text-sm text-muted-2">Nothing to preview yet.</p>}
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-muted-2">
        Paste straight from ChatGPT, Word or Google Docs. Headings, bold text, lists and links are formatted automatically and Markdown
        symbols like ** and # are hidden. Your wording is not changed.
        {maxLength && markdown.length > maxLength * 0.9 ? ` ${markdown.length.toLocaleString()} / ${maxLength.toLocaleString()} characters.` : ""}
      </p>

      <textarea
        name={name}
        value={markdown}
        readOnly
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        aria-hidden
        tabIndex={-1}
        className="sr-only"
        onInvalid={() => {
          setMode("write")
          editorRef.current?.focus()
        }}
      />
      {required && tooShort && markdown.length > 0 ? (
        <p className="text-xs text-muted-2">At least {minLength} characters needed.</p>
      ) : null}
    </div>
  )
}
