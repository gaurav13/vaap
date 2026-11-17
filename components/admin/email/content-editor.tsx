"use client"

import { useRef, useState } from "react"
import { ArrowDown, ArrowUp, Heading, ImageIcon, Minus, MousePointerClick, Trash2, Type, Upload, X } from "lucide-react"
import { RichTextField } from "@/components/admin/rich-text-editor"
import { uploadPageImageFile } from "@/components/admin/upload-image"
import { BRAND_COLORS, type BlockAlign, type CampaignContent, type ContentBlock } from "@/lib/newsletter/content"
import { cn } from "@/lib/utils"
import { Btn, Field, inputCls } from "./shared"

const upload = (file: File) => uploadPageImageFile(file, "pages")

export function ColorPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      {BRAND_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          aria-label={c.label}
          aria-pressed={value.toLowerCase() === c.value}
          title={c.label}
          className={cn(
            "size-8 rounded-full border-2 transition-transform",
            value.toLowerCase() === c.value ? "scale-110 border-heading" : "border-transparent",
          )}
          style={{ backgroundColor: c.value }}
        />
      ))}
      <label className="flex items-center gap-2 text-xs text-muted-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-8 cursor-pointer rounded border border-line bg-card" />
        Custom
      </label>
    </div>
  )
}

function AlignPicker({ value, onChange }: { value: BlockAlign; onChange: (v: BlockAlign) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-line" role="group" aria-label="Alignment">
      {(["left", "center", "right"] as const).map((a) => (
        <button
          key={a}
          type="button"
          aria-pressed={value === a}
          onClick={() => onChange(a)}
          className={cn("h-9 px-3 text-xs font-semibold capitalize", value === a ? "bg-mint text-green" : "text-body hover:bg-surface")}
        >
          {a === "center" ? "Centre" : a}
        </button>
      ))}
    </div>
  )
}

function ImageInput({ value, onChange, label, disabled }: { value: string; onChange: (v: string) => void; label: string; disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  return (
    <div className="flex flex-col gap-2">
      {value && (
        <div className="relative overflow-hidden rounded-lg border border-line bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="max-h-48 w-full object-contain" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-2 rounded-md bg-card p-1 text-heading shadow"
              aria-label={`Remove ${label}`}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" aria-label={`${label} URL`} disabled={disabled} />
        <Btn variant="secondary" disabled={disabled || busy} onClick={() => fileRef.current?.click()} className="shrink-0">
          <Upload className="size-4" aria-hidden="true" />
          {busy ? "Uploading…" : "Upload"}
        </Btn>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (!file) return
            setBusy(true)
            setError("")
            try {
              onChange(await upload(file))
            } catch (err) {
              setError(err instanceof Error ? err.message : "Upload failed.")
            } finally {
              setBusy(false)
            }
          }}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()))

function makeBlock(type: ContentBlock["type"]): ContentBlock {
  const id = newId()
  switch (type) {
    case "text":
      return { id, type, html: "" }
    case "heading":
      return { id, type, text: "", level: 2, align: "left" }
    case "image":
      return { id, type, url: "", alt: "", href: "" }
    case "button":
      return { id, type, label: "", url: "", color: BRAND_COLORS[0].value, align: "center" }
    default:
      return { id, type: "divider" }
  }
}

const BLOCK_TYPES = [
  { type: "text", label: "Text box", icon: Type },
  { type: "heading", label: "Heading", icon: Heading },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "button", label: "Button", icon: MousePointerClick },
  { type: "divider", label: "Divider", icon: Minus },
] as const

function BlocksEditor({ blocks, onChange, disabled }: { blocks: ContentBlock[]; onChange: (b: ContentBlock[]) => void; disabled?: boolean }) {
  const update = (id: string, patch: Partial<ContentBlock>) =>
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as ContentBlock) : b)))
  const move = (i: number, dir: -1 | 1) => {
    const next = [...blocks]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => (
        <div key={b.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">
              {BLOCK_TYPES.find((t) => t.type === b.type)?.label}
            </span>
            {!disabled && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 text-body hover:bg-card disabled:opacity-30" aria-label="Move block up">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className="rounded p-1.5 text-body hover:bg-card disabled:opacity-30" aria-label="Move block down">
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" onClick={() => onChange(blocks.filter((x) => x.id !== b.id))} className="rounded p-1.5 text-destructive hover:bg-destructive/10" aria-label="Delete block">
                  <Trash2 className="size-4" />
                </button>
              </div>
            )}
          </div>

          {b.type === "text" && (
            <RichTextField
              value={b.html}
              onChange={(html) => update(b.id, { html })}
              disabled={disabled}
              onUploadImage={upload}
              alignment
              colors={BRAND_COLORS}
              compact
              label="Text box content"
              placeholder="Write this section…"
            />
          )}

          {b.type === "heading" && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input className={inputCls} value={b.text} onChange={(e) => update(b.id, { text: e.target.value })} placeholder="Section heading" aria-label="Heading text" disabled={disabled} />
              <select
                className={cn(inputCls, "sm:w-32")}
                value={b.level}
                onChange={(e) => update(b.id, { level: Number(e.target.value) as 2 | 3 })}
                aria-label="Heading size"
                disabled={disabled}
              >
                <option value={2}>Large</option>
                <option value={3}>Medium</option>
              </select>
              <AlignPicker value={b.align} onChange={(align) => update(b.id, { align })} />
            </div>
          )}

          {b.type === "image" && (
            <div className="flex flex-col gap-2">
              <ImageInput value={b.url} onChange={(url) => update(b.id, { url })} label="Image" disabled={disabled} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={inputCls} value={b.alt} onChange={(e) => update(b.id, { alt: e.target.value })} placeholder="Describe the image (alt text)" aria-label="Image alt text" disabled={disabled} />
                <input className={inputCls} value={b.href} onChange={(e) => update(b.id, { href: e.target.value })} placeholder="Link when clicked (optional)" aria-label="Image link" disabled={disabled} />
              </div>
            </div>
          )}

          {b.type === "button" && (
            <div className="flex flex-col gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={inputCls} value={b.label} onChange={(e) => update(b.id, { label: e.target.value })} placeholder="Button text" aria-label="Button text" disabled={disabled} />
                <input className={inputCls} value={b.url} onChange={(e) => update(b.id, { url: e.target.value })} placeholder="https://vaap.org.pk/…" aria-label="Button link" disabled={disabled} />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <ColorPicker value={b.color} onChange={(color) => update(b.id, { color })} label="Button colour" />
                <AlignPicker value={b.align} onChange={(align) => update(b.id, { align })} />
              </div>
            </div>
          )}

          {b.type === "divider" && <hr className="border-line" />}
        </div>
      ))}

      {!disabled && (
        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map((t) => (
            <Btn key={t.type} variant="secondary" onClick={() => onChange([...blocks, makeBlock(t.type)])} className="h-9 px-3">
              <t.icon className="size-4" aria-hidden="true" />
              Add {t.label.toLowerCase()}
            </Btn>
          ))}
        </div>
      )}
    </div>
  )
}

export function ContentEditor({
  content,
  onChange,
  disabled,
  titleLabel,
}: {
  content: CampaignContent
  onChange: (patch: Partial<CampaignContent>) => void
  disabled?: boolean
  titleLabel: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={titleLabel} htmlFor="c-title">
          <input id="c-title" className={inputCls} value={content.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={200} disabled={disabled} required />
        </Field>
        <Field label="Email subject" htmlFor="c-subject" hint="Shown in the inbox. Defaults to the title when empty.">
          <input id="c-subject" className={inputCls} value={content.subject} onChange={(e) => onChange({ subject: e.target.value })} maxLength={200} disabled={disabled} />
        </Field>
        <Field label="Preview description" htmlFor="c-preview" hint="The grey line many inboxes show after the subject.">
          <input id="c-preview" className={inputCls} value={content.previewText} onChange={(e) => onChange({ previewText: e.target.value })} maxLength={200} disabled={disabled} />
        </Field>
        <Field label="Subheading" htmlFor="c-sub">
          <input id="c-sub" className={inputCls} value={content.subheading} onChange={(e) => onChange({ subheading: e.target.value })} maxLength={200} disabled={disabled} />
        </Field>
      </div>

      <Field label="Banner image">
        <ImageInput value={content.bannerUrl} onChange={(bannerUrl) => onChange({ bannerUrl })} label="Banner image" disabled={disabled} />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-heading">Main content</span>
        <RichTextField
          value={content.bodyHtml}
          onChange={(bodyHtml) => onChange({ bodyHtml })}
          disabled={disabled}
          onUploadImage={upload}
          alignment
          colors={BRAND_COLORS}
          label="Main email content"
          placeholder="Write your message. Use {{name}} to greet each recipient by name."
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-heading">Additional sections</span>
        <p className="text-xs leading-relaxed text-muted-2">Add text boxes, headings, images, buttons and dividers below the main content.</p>
        <BlocksEditor blocks={content.blocks} onChange={(blocks) => onChange({ blocks })} disabled={disabled} />
      </div>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-heading">Main call-to-action button</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Button text" htmlFor="c-cta-label">
            <input id="c-cta-label" className={inputCls} value={content.ctaLabel} onChange={(e) => onChange({ ctaLabel: e.target.value })} maxLength={60} disabled={disabled} placeholder="e.g. Read more" />
          </Field>
          <Field label="Button link" htmlFor="c-cta-url">
            <input id="c-cta-url" className={inputCls} value={content.ctaUrl} onChange={(e) => onChange({ ctaUrl: e.target.value })} disabled={disabled} placeholder="https://…" />
          </Field>
        </div>
        <ColorPicker value={content.ctaColor} onChange={(ctaColor) => onChange({ ctaColor })} label="Button colour" />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-heading">Footer</span>
        <RichTextField
          value={content.footerHtml}
          onChange={(footerHtml) => onChange({ footerHtml })}
          disabled={disabled}
          alignment
          compact
          label="Footer content"
          placeholder="Optional closing note. The VAAP address and unsubscribe link are added automatically."
        />
      </div>
    </div>
  )
}
