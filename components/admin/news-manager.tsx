"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileUpload } from "@/components/admin/file-upload"
import { createNews, updateNews, deleteNews } from "@/app/actions/admin"
import { NEWS_CATEGORIES } from "@/lib/news-options"

type NewsItem = {
  id: number
  title: string
  category: string
  excerpt: string
  content: string
  image: string | null
  publisherName: string
  publisherLogo: string | null
  externalUrl: string | null
  sourceType: "original" | "external"
  originalPublishedAt: string | null
  committeeId: number | null
  published: boolean
  createdAt: string
}

type CommitteeOption = { id: number; name: string }

const CATEGORIES = NEWS_CATEGORIES

export function NewsManager({ items, committees = [] }: { items: NewsItem[]; committees?: CommitteeOption[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<NewsItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceType, setSourceType] = useState<"original" | "external">("original")

  function openEditor(item: NewsItem | null) {
    setEditing(item)
    setCreating(item === null)
    setSourceType(item?.sourceType ?? "original")
    setError(null)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = editing ? await updateNews(editing.id, formData) : await createNews(formData)
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
      await deleteNews(id)
      router.refresh()
    })
  }

  const showForm = creating || editing !== null

  return (
    <div className="mt-6">
      {!showForm && (
        <Button onClick={() => openEditor(null)} className="mb-6">
          <Plus className="size-4" /> New Post
        </Button>
      )}

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="mb-8 rounded-xl border border-line bg-card p-6"
          key={editing?.id ?? "new"}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-heading">{editing ? "Edit Post" : "New Post"}</h2>
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

          <div className="mt-4 grid gap-4">
            <Field label="Title">
              <input name="title" defaultValue={editing?.title} required className={inputCls} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select name="category" defaultValue={editing?.category ?? CATEGORIES[0]} className={inputCls}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-body">Image</span>
              <FileUpload
                name="image"
                kind="image"
                storage="spaces"
                folder="news"
                defaultValue={editing?.image ?? ""}
                onBusyChange={setUploading}
              />
            </div>
            <fieldset className="grid gap-4 rounded-lg border border-line p-4">
              <legend className="px-1 text-sm font-semibold text-heading">Article type &amp; publisher</legend>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Article type">
                {(
                  [
                    { value: "original", label: "Original Content", hint: "Written and published by VAAP" },
                    { value: "external", label: "External Publisher", hint: "Credits and links to the original outlet" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      sourceType === opt.value ? "border-green bg-mint" : "border-line hover:border-green-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sourceType"
                      value={opt.value}
                      checked={sourceType === opt.value}
                      onChange={() => setSourceType(opt.value)}
                      className="mt-0.5 size-4 accent-[var(--color-green)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-heading">{opt.label}</span>
                      <span className="block text-xs text-muted-2">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-2">
                {sourceType === "external"
                  ? "A publisher credit with a “Read Original Article” button is shown on the article page. Only post an authorised excerpt or summary — not the full copyrighted article."
                  : "Optional: add an outlet and link if this post was also covered elsewhere."}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={sourceType === "external" ? "Publisher name *" : "Publisher name"}>
                  <input
                    name="publisherName"
                    defaultValue={editing?.publisherName}
                    placeholder="e.g. Dawn"
                    maxLength={80}
                    required={sourceType === "external"}
                    className={inputCls}
                  />
                </Field>
                <Field label={sourceType === "external" ? "Original article URL *" : "Original article URL"}>
                  <input
                    name="externalUrl"
                    type="url"
                    defaultValue={editing?.externalUrl ?? ""}
                    placeholder="https://www.dawn.com/news/..."
                    required={sourceType === "external"}
                    className={inputCls}
                  />
                </Field>
                <Field label="Original publication date">
                  <input
                    name="originalPublishedAt"
                    type="date"
                    defaultValue={editing?.originalPublishedAt ?? ""}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-body">Publisher logo</span>
                <FileUpload
                  name="publisherLogo"
                  kind="image"
                  storage="spaces"
                  folder="news"
                  defaultValue={editing?.publisherLogo ?? ""}
                  onBusyChange={setUploading}
                />
              </div>
            </fieldset>
            <Field label="Committee (optional)">
              <select name="committeeId" defaultValue={editing?.committeeId ? String(editing.committeeId) : ""} className={inputCls}>
                <option value="">Not linked to a committee</option>
                {committees.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted-2">
                Linked posts appear in the &quot;Latest Updates&quot; section on the Committees page.
              </span>
            </Field>
            <Field label="Summary (optional — shown below the social bar)">
              <textarea name="excerpt" defaultValue={editing?.excerpt} rows={2} className={inputCls} />
            </Field>
            <Field label="Content">
              <textarea name="content" defaultValue={editing?.content} rows={5} className={inputCls} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                name="published"
                defaultChecked={editing ? editing.published : true}
                className="size-4 accent-[var(--color-green)]"
              />
              Published (visible on the public site)
            </label>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <Button type="submit" disabled={pending || uploading}>
              {uploading ? "Uploading image…" : pending ? "Saving…" : editing ? "Save Changes" : "Publish"}
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-2">No news posts yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-mint px-2 py-0.5 text-[11px] font-semibold text-green">
                      {item.category}
                    </span>
                    {item.sourceType === "external" && (
                      <span className="rounded-md bg-navy/10 px-2 py-0.5 text-[11px] font-semibold text-navy">
                        External · {item.publisherName || "Publisher"}
                      </span>
                    )}
                    {item.committeeId && (
                      <span className="rounded-md bg-navy/10 px-2 py-0.5 text-[11px] font-semibold text-navy">
                        {committees.find((c) => c.id === item.committeeId)?.name ?? "Committee"}
                      </span>
                    )}
                    {!item.published && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-2">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-sm font-bold text-heading">{item.title}</p>
                  <p className="truncate text-xs text-muted-2">{item.excerpt}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <a
                    href={`/news/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex size-9 items-center justify-center rounded-md transition-colors ${
                      item.published
                        ? "text-muted-2 hover:bg-mint hover:text-green"
                        : "pointer-events-none text-muted-2/40"
                    }`}
                    aria-label={item.published ? "View live post" : "Publish to view live"}
                    title={item.published ? "View live post" : "Publish to view live"}
                  >
                    <Eye className="size-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => openEditor(item)}
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
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm text-heading outline-none transition-colors focus:border-green-border focus:ring-2 focus:ring-green/20"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-body">{label}</span>
      {children}
    </label>
  )
}
