"use client"

import { useMemo, useState, useTransition } from "react"
import {
  PenSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Globe,
  EyeOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { reviewArticle, publishArticle, unpublishArticle } from "@/app/actions/articles"

type Article = {
  id: number
  title: string
  slug: string
  category: string
  excerpt: string
  content: string
  authorName: string
  authorRole: string
  image: string | null
  status: string
  updatedAt: string
  publishedAt: string | null
}

const STATUS_META: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  submitted: { label: "In Review", icon: Clock, className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-mint text-green" },
  changes_requested: { label: "Changes Requested", icon: AlertCircle, className: "bg-orange-100 text-orange-700" },
  published: { label: "Published", icon: Globe, className: "bg-green text-white" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-100 text-red-700" },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.submitted
  const Icon = meta.icon
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", meta.className)}>
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  )
}

const TABS = [
  { key: "submitted", label: "In Review" },
  { key: "approved", label: "Approved" },
  { key: "published", label: "Published" },
  { key: "changes_requested", label: "Changes" },
  { key: "rejected", label: "Rejected" },
] as const

export function ArticleReview({ initial }: { initial: Article[] }) {
  const [articles, setArticles] = useState<Article[]>(initial)
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("submitted")
  const [active, setActive] = useState<Article | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const a of articles) c[a.status] = (c[a.status] ?? 0) + 1
    return c
  }, [articles])

  const filtered = articles.filter((a) => a.status === tab)

  function apply(id: number, patch: Partial<Article>) {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    setActive((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev))
  }

  function doReview(decision: "approved" | "changes_requested" | "rejected") {
    if (!active) return
    setError(null)
    startTransition(async () => {
      const res = await reviewArticle({ id: active.id, decision, note })
      if (!res.ok) {
        setError(res.error)
        return
      }
      apply(active.id, { status: decision })
      setNote("")
    })
  }

  function doPublish() {
    if (!active) return
    setError(null)
    startTransition(async () => {
      const res = await publishArticle(active.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      apply(active.id, { status: "published", publishedAt: new Date().toISOString() })
    })
  }

  function doUnpublish() {
    if (!active) return
    setError(null)
    startTransition(async () => {
      const res = await unpublishArticle(active.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      apply(active.id, { status: "approved", publishedAt: null })
    })
  }

  if (active) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <button
          onClick={() => {
            setActive(null)
            setError(null)
            setNote("")
          }}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-2 hover:text-heading"
        >
          <ArrowLeft className="size-4" /> Back to queue
        </button>

        <div className="rounded-2xl border border-line bg-card p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-green">{active.category}</span>
              <h1 className="mt-1 text-2xl font-bold text-heading text-balance">{active.title}</h1>
              <p className="mt-1 text-sm text-muted-2">
                By {active.authorName || "Unknown"} · {active.authorRole}
              </p>
            </div>
            <StatusBadge status={active.status} />
          </div>

          {active.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.image || "/placeholder.svg"}
              alt={active.title}
              className="mt-5 aspect-[16/9] w-full rounded-xl object-cover"
            />
          )}

          {active.excerpt && <p className="mt-5 text-base font-medium text-body">{active.excerpt}</p>}

          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-body">{active.content}</div>

          {error && <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="mt-7 border-t border-line pt-6">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-heading">Reviewer note (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Explain what needs to change, or leave a note for the author."
                className="w-full resize-y rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-heading outline-none focus:border-green"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              {active.status !== "published" && (
                <button
                  onClick={() => doReview("approved")}
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold text-heading hover:bg-muted disabled:opacity-50"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Approve
                </button>
              )}
              {(active.status === "approved" || active.status === "submitted") && (
                <button
                  onClick={doPublish}
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-green/90 disabled:opacity-50"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
                  Publish
                </button>
              )}
              {active.status === "published" && (
                <button
                  onClick={doUnpublish}
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold text-heading hover:bg-muted disabled:opacity-50"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <EyeOff className="size-4" />}
                  Unpublish
                </button>
              )}
              {active.status !== "published" && (
                <>
                  <button
                    onClick={() => doReview("changes_requested")}
                    disabled={pending}
                    className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                  >
                    <AlertCircle className="size-4" /> Request changes
                  </button>
                  <button
                    onClick={() => doReview("rejected")}
                    disabled={pending}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle className="size-4" /> Reject
                  </button>
                </>
              )}
              {active.status === "published" && (
                <a
                  href={`/insights/${active.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold text-green hover:bg-muted"
                >
                  <Globe className="size-4" /> View live
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-heading">
        <PenSquare className="size-6 text-green" /> Article Review
      </h1>
      <p className="mt-1 text-sm text-muted-2">Review member submissions, request changes, and publish to the public insights page.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
              tab === t.key ? "bg-green text-white" : "border border-line bg-card text-heading hover:bg-muted",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                tab === t.key ? "bg-white/20 text-white" : "bg-muted text-muted-2",
              )}
            >
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-card">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-2">No articles in this stage.</div>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => {
                    setActive(a)
                    setError(null)
                    setNote("")
                  }}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-heading">{a.title}</p>
                    <p className="mt-0.5 text-xs text-muted-2">
                      {a.category} · {a.authorName || "Unknown"} · Updated{" "}
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
