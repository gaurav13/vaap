"use client"

import { useState, useTransition } from "react"
import { PenSquare, Plus, Send, Loader2, ArrowLeft, CheckCircle2, Clock, AlertCircle, XCircle, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveArticleDraft, submitArticle } from "@/app/actions/articles"
import { RichTextField } from "@/components/admin/rich-text-editor"

type Article = {
  id: number
  title: string
  slug: string
  category: string
  excerpt: string
  content: string
  tags: string
  image: string | null
  seoTitle: string
  seoDescription: string
  status: string
  updatedAt: string
}

const CATEGORIES = ["Insight", "Policy", "Research", "Community", "Announcement", "Education"]

const STATUS_META: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  draft: { label: "Draft", icon: FileText, className: "bg-muted text-muted-2" },
  submitted: { label: "In Review", icon: Clock, className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-mint text-green" },
  changes_requested: { label: "Changes Requested", icon: AlertCircle, className: "bg-orange-100 text-orange-700" },
  published: { label: "Published", icon: CheckCircle2, className: "bg-green text-white" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-100 text-red-700" },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft
  const Icon = meta.icon
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}>
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  )
}

const EMPTY: Article = {
  id: 0,
  title: "",
  slug: "",
  category: "Insight",
  excerpt: "",
  content: "",
  tags: "",
  image: null,
  seoTitle: "",
  seoDescription: "",
  status: "draft",
  updatedAt: new Date().toISOString(),
}

export function ArticlesWorkspace({
  initialArticles,
  canPublish,
}: {
  initialArticles: Article[]
  canPublish: boolean
}) {
  const [articles, setArticles] = useState<Article[]>(initialArticles)
  const [editing, setEditing] = useState<Article | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function openNew() {
    setError(null)
    setNotice(null)
    setEditing({ ...EMPTY })
  }

  function openEdit(a: Article) {
    setError(null)
    setNotice(null)
    setEditing({ ...a })
  }

  function save(thenSubmit: boolean) {
    if (!editing) return
    setError(null)
    startTransition(async () => {
      const res = await saveArticleDraft({
        id: editing.id || undefined,
        title: editing.title,
        category: editing.category,
        excerpt: editing.excerpt,
        content: editing.content,
        tags: editing.tags,
        image: editing.image ?? undefined,
        seoTitle: editing.seoTitle,
        seoDescription: editing.seoDescription,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      const savedId = res.id
      if (thenSubmit && savedId) {
        const sub = await submitArticle(savedId)
        if (!sub.ok) {
          setError(sub.error)
          return
        }
      }
      // Reflect locally.
      setArticles((prev) => {
        const next: Article = {
          ...editing,
          id: savedId ?? editing.id,
          status: thenSubmit ? "submitted" : editing.id ? editing.status : "draft",
          updatedAt: new Date().toISOString(),
        }
        const exists = prev.some((p) => p.id === next.id)
        return exists ? prev.map((p) => (p.id === next.id ? next : p)) : [next, ...prev]
      })
      setNotice(thenSubmit ? "Article submitted for editorial review." : "Draft saved.")
      setEditing(null)
    })
  }

  if (editing) {
    const isNew = !editing.id
    const locked = editing.status === "submitted" || editing.status === "published"
    return (
      <div>
        <button
          onClick={() => setEditing(null)}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-2 hover:text-heading"
        >
          <ArrowLeft className="size-4" /> Back to articles
        </button>

        <div className="rounded-2xl border border-line bg-card p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-heading">{isNew ? "New article" : "Edit article"}</h1>
            {!isNew && <StatusBadge status={editing.status} />}
          </div>

          {locked && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              This article is {editing.status === "published" ? "published" : "in review"} and can no longer be edited
              here.
            </p>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="mt-6 grid gap-5">
            <Field label="Title">
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                disabled={locked}
                className="input"
                placeholder="A clear, compelling headline"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Category">
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  disabled={locked}
                  className="input"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tags (comma separated)">
                <input
                  value={editing.tags}
                  onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                  disabled={locked}
                  className="input"
                  placeholder="regulation, defi, pakistan"
                />
              </Field>
            </div>

            <Field label="Cover image URL (optional)">
              <input
                value={editing.image ?? ""}
                onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                disabled={locked}
                className="input"
                placeholder="https://…"
              />
            </Field>

            <Field label="Excerpt">
              <textarea
                value={editing.excerpt}
                onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                disabled={locked}
                rows={2}
                className="input resize-y"
                placeholder="A one or two sentence summary shown on cards."
              />
            </Field>

            <Field label="Content">
              <RichTextField
                key={editing.id || "new"}
                value={editing.content}
                onChange={(html) => setEditing((prev) => (prev ? { ...prev, content: html } : prev))}
                disabled={locked}
                placeholder="Write your article here. Use the toolbar to format headings, bold, lists, and links."
              />
            </Field>

            <details className="rounded-lg border border-line bg-muted/40 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-heading">SEO settings (optional)</summary>
              <div className="mt-4 grid gap-4">
                <Field label="SEO title">
                  <input
                    value={editing.seoTitle}
                    onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })}
                    disabled={locked}
                    className="input"
                  />
                </Field>
                <Field label="SEO description">
                  <textarea
                    value={editing.seoDescription}
                    onChange={(e) => setEditing({ ...editing, seoDescription: e.target.value })}
                    disabled={locked}
                    rows={2}
                    className="input resize-y"
                  />
                </Field>
              </div>
            </details>
          </div>

          {!locked && (
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => save(false)}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold text-heading hover:bg-muted disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                Save draft
              </button>
              <button
                onClick={() => save(true)}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-green/90 disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {editing.status === "changes_requested" ? "Resubmit for review" : "Submit for review"}
              </button>
            </div>
          )}
        </div>

        <style jsx>{`
          :global(.input) {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid var(--line, #e2e8f0);
            background: var(--card, #fff);
            padding: 0.625rem 0.75rem;
            font-size: 0.875rem;
            color: var(--heading, #0f172a);
            outline: none;
          }
          :global(.input:focus) {
            border-color: var(--green, #16a34a);
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--green, #16a34a) 15%, transparent);
          }
          :global(.input:disabled) {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-heading">
            <PenSquare className="size-6 text-green" /> Articles
          </h1>
          <p className="mt-1 text-sm text-muted-2">
            Write insights and submit them for editorial review.{" "}
            {canPublish ? "As an editor you can also publish directly from the admin console." : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-green/90"
        >
          <Plus className="size-4" /> New article
        </button>
      </div>

      {notice && <p className="mt-4 rounded-lg bg-mint px-3 py-2 text-sm font-medium text-green">{notice}</p>}

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-card">
        {articles.length === 0 ? (
          <div className="p-10 text-center">
            <PenSquare className="mx-auto size-8 text-muted-2" />
            <p className="mt-3 text-sm text-muted-2">You haven&apos;t written any articles yet.</p>
            <button onClick={openNew} className="mt-4 text-sm font-semibold text-green hover:underline">
              Write your first article
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {articles.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => openEdit(a)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-heading">{a.title || "Untitled draft"}</p>
                    <p className="mt-0.5 text-xs text-muted-2">
                      {a.category} · Updated{" "}
                      {new Date(a.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-heading">{label}</span>
      {children}
    </label>
  )
}
