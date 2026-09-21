"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveEntity, deleteEntity } from "@/app/actions/cms"
import { ENTITIES, type EntityKey, type FieldDef } from "@/lib/cms/entities"
import { RichTextEditor } from "@/components/admin/rich-text-editor"
import { FileUpload } from "@/components/admin/file-upload"

type Row = Record<string, unknown> & { id: number }

export function EntityManager({ entity, items }: { entity: EntityKey; items: Row[] }) {
  const config = ENTITIES[entity]
  const router = useRouter()
  const [editing, setEditing] = useState<Row | null>(null)
  const [creating, setCreating] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await saveEntity(entity, editing ? editing.id : null, formData)
      if (res && !res.ok) {
        setError(res.error ?? "Something went wrong.")
        return
      }
      setEditing(null)
      setCreating(false)
      router.refresh()
    })
  }

  function onDelete(id: number) {
    startTransition(async () => {
      await deleteEntity(entity, id)
      router.refresh()
    })
  }

  const showForm = creating || editing !== null

  return (
    <div className="mt-6">
      {!showForm && (
        <Button onClick={() => setCreating(true)} className="mb-6">
          <Plus className="size-4" /> New {config.singular}
        </Button>
      )}

      {showForm && (
        <form onSubmit={onSubmit} className="mb-8 rounded-xl border border-line bg-card p-6" key={editing?.id ?? "new"}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-heading">
              {editing ? `Edit ${config.singular}` : `New ${config.singular}`}
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setCreating(false)
                setError(null)
              }}
              className="text-muted-2 hover:text-navy"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {config.fields.map((field) => (
              <FieldRenderer key={field.name} field={field} value={editing?.[field.name]} />
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-5 flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save Changes" : "Create"}
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-2">No {config.label.toLowerCase()} yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => {
              const title = String(item[config.list.title] ?? "Untitled")
              const subtitle = config.list.subtitle ? String(item[config.list.subtitle] ?? "") : ""
              const badge = config.list.badge ? String(item[config.list.badge] ?? "") : ""
              const flagOn = config.list.flag ? Boolean(item[config.list.flag]) : false
              const isDraft = "published" in item ? item.published === false : item.status === "draft"
              return (
                <li key={item.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {badge && (
                        <span className="rounded-md bg-mint px-2 py-0.5 text-[11px] font-semibold text-green">{badge}</span>
                      )}
                      {flagOn && config.list.flag && (
                        <span className="rounded-md bg-navy/10 px-2 py-0.5 text-[11px] font-semibold text-navy">
                          {labelForFlag(config.list.flag)}
                        </span>
                      )}
                      {isDraft && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-2">
                          {"published" in item ? "Draft" : "Draft"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-sm font-bold text-heading">{title}</p>
                    {subtitle && <p className="truncate text-xs text-muted-2">{subtitle}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {viewHref(config, item) && (
                      <a
                        href={viewHref(config, item) as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-9 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-mint hover:text-green"
                        aria-label="View live"
                        title="View live"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(item)
                        setCreating(false)
                      }}
                      className="flex size-9 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-mint hover:text-navy"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      disabled={pending}
                      className="flex size-9 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function viewHref(config: (typeof ENTITIES)[EntityKey], item: Row): string | null {
  if (!config.viewUrl) return null
  // Only link to a live page for published/active items.
  const isDraft = "published" in item ? item.published === false : item.status === "draft"
  if (isDraft && "published" in item) return null
  try {
    return config.viewUrl(item)
  } catch {
    return null
  }
}

function labelForFlag(flag: string) {
  if (flag === "membersOnly") return "Members only"
  if (flag === "votingEligible") return "Voting"
  return flag
}

function FieldRenderer({ field, value }: { field: FieldDef; value: unknown }) {
  const wrapCls = field.fullWidth || field.type === "textarea" ? "sm:col-span-2" : ""

  if (field.autoUsdFrom) {
    return <CurrencyNoteField field={field} value={value} sourceName={field.autoUsdFrom} />
  }

  if (field.type === "richtext") {
    return (
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-body">
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </span>
        <RichTextEditor name={field.name} defaultValue={strVal(value)} placeholder={field.placeholder} />
        {field.help && <span className="mt-1 block text-xs text-muted-2">{field.help}</span>}
      </div>
    )
  }

  if (field.type === "image" || field.type === "file") {
    return (
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-body">
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </span>
        <FileUpload name={field.name} kind={field.type === "image" ? "image" : "file"} defaultValue={strVal(value)} required={field.required} />
        {field.help && <span className="mt-1 block text-xs text-muted-2">{field.help}</span>}
      </div>
    )
  }

  if (field.type === "checkbox") {
    return (
      <label className={`flex items-center gap-2 text-sm text-body ${wrapCls}`}>
        <input
          type="checkbox"
          name={field.name}
          defaultChecked={value === undefined ? true : Boolean(value)}
          className="size-4 accent-[var(--color-green)]"
        />
        {field.label}
      </label>
    )
  }

  return (
    <label className={`block ${wrapCls}`}>
      <span className="mb-1.5 block text-sm font-medium text-body">
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </span>
      {field.type === "textarea" ? (
        <textarea name={field.name} defaultValue={strVal(value)} rows={4} placeholder={field.placeholder} className={inputCls} />
      ) : field.type === "select" ? (
        <select name={field.name} defaultValue={strVal(value) || field.options?.[0]} className={inputCls}>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          name={field.name}
          defaultValue={strVal(value)}
          required={field.required}
          placeholder={field.placeholder}
          className={inputCls}
        />
      )}
      {field.help && <span className="mt-1 block text-xs text-muted-2">{field.help}</span>}
    </label>
  )
}

function strVal(value: unknown) {
  if (value === null || value === undefined) return ""
  return String(value)
}

// PKR per 1 USD. PKR 500,000 -> ~USD 1,800 and PKR 100,000 -> ~USD 360.
const PKR_PER_USD = 278

function computeUsdNote(pkrText: string): string {
  const n = Number.parseFloat(pkrText.replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(n) || n <= 0) return ""
  const usd = n / PKR_PER_USD
  const rounded = usd >= 100 ? Math.round(usd / 10) * 10 : Math.round(usd)
  return `approx. USD ${rounded.toLocaleString("en-US")}`
}

function CurrencyNoteField({ field, value, sourceName }: { field: FieldDef; value: unknown; sourceName: string }) {
  const initial = strVal(value)
  const [manual, setManual] = useState(initial !== "" && initial !== computeUsdNote(""))
  const [note, setNote] = useState(initial)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (manual) return
    const form = inputRef.current?.form
    const source = form?.elements.namedItem(sourceName) as HTMLInputElement | null
    if (!source) return
    const update = () => setNote(computeUsdNote(source.value))
    update()
    source.addEventListener("input", update)
    return () => source.removeEventListener("input", update)
  }, [manual, sourceName])

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-body">
        {field.label}
        <button
          type="button"
          onClick={() => setManual((m) => !m)}
          className="text-xs font-medium text-green transition-colors hover:text-green-hover"
        >
          {manual ? "Use auto" : "Edit manually"}
        </button>
      </span>
      <input
        ref={inputRef}
        type="text"
        name={field.name}
        value={note}
        onChange={manual ? (e) => setNote(e.target.value) : undefined}
        readOnly={!manual}
        placeholder={field.placeholder}
        aria-readonly={!manual}
        className={`${inputCls} ${!manual ? "bg-muted text-muted-2" : ""}`}
      />
      <span className="mt-1 block text-xs text-muted-2">
        {manual ? "Manual override — auto-conversion is off." : `Auto-calculated at PKR ${PKR_PER_USD} per USD.`}
      </span>
    </label>
  )
}

const inputCls =
  "w-full rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm text-heading outline-none transition-colors focus:border-green-border focus:ring-2 focus:ring-green/20"
