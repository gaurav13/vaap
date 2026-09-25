"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MessagesSquare, Send, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react"
import { deleteProposalCommentAction, postProposalCommentAction } from "@/app/actions/proposal-extras"
import { COMMENT_DAILY_LIMIT, COMMUNITY_RULES, validateCommentText } from "@/lib/comment-moderation"

export type DiscussionComment = {
  id: number
  authorName: string
  authorRole: string
  body: string
  createdAt: string
  canDelete: boolean
}

const MAX = 2000

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "M"
  )
}

export function ProposalDiscussion({
  proposalId,
  comments,
  canPost,
  blockedReason,
  loginHref,
}: {
  proposalId: number
  comments: DiscussionComment[]
  canPost: boolean
  blockedReason: string | null
  loginHref: string | null
}) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const liveIssue = body.trim().length >= 2 ? validateCommentText(body) : null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await postProposalCommentAction(proposalId, body)
      if (!res.ok) return setError(res.error)
      setBody("")
      router.refresh()
    })
  }

  function remove(id: number) {
    if (!window.confirm("Delete this comment?")) return
    setDeletingId(id)
    startTransition(async () => {
      const res = await deleteProposalCommentAction(id)
      setDeletingId(null)
      if (!res.ok) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="inline-flex items-center gap-2 text-lg font-bold text-heading">
        <MessagesSquare className="size-5 text-green" aria-hidden="true" /> Member Discussion
      </h2>

      <section aria-labelledby="community-rules" className="rounded-xl border border-line bg-muted/40 px-4 py-3">
        <h3 id="community-rules" className="inline-flex items-center gap-2 text-sm font-semibold text-heading">
          <ShieldAlert className="size-4 text-green" aria-hidden="true" /> Community Rules
        </h3>
        <ul className="mt-2 flex flex-col gap-1 pl-5 text-sm leading-relaxed text-muted-2 marker:text-green list-disc">
          {COMMUNITY_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-2">
          Comments that break these rules are blocked automatically and may be removed by VAAP administrators.
        </p>
      </section>

      {canPost ? (
        <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-line p-4">
          <label htmlFor="comment-body" className="text-sm font-medium text-heading">
            Share your view on this proposal
          </label>
          <textarea
            id="comment-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX}
            rows={4}
            onPaste={(e) => {
              if (e.clipboardData.files.length > 0) {
                e.preventDefault()
                setError("Images and files cannot be added to comments. Plain text only.")
              }
            }}
            onDrop={(e) => {
              if (e.dataTransfer.files.length > 0) {
                e.preventDefault()
                setError("Images and files cannot be added to comments. Plain text only.")
              }
            }}
            placeholder="Plain text only. No links, emails, phone numbers, or abusive language."
            aria-describedby="comment-hint"
            aria-invalid={Boolean(liveIssue)}
            className="resize-y rounded-lg border border-line bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-green aria-[invalid=true]:border-destructive"
          />
          {liveIssue && <p className="text-xs text-destructive">{liveIssue}</p>}
          <div className="flex items-center justify-between gap-3">
            <span id="comment-hint" className="text-xs text-muted-2">
              {body.length}/{MAX} · 1 comment per hour, max {COMMENT_DAILY_LIMIT} per day
            </span>
            <button
              type="submit"
              disabled={pending || body.trim().length < 2 || Boolean(liveIssue)}
              className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending && deletingId === null ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              Post comment
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green/30 bg-green/5 px-4 py-3 text-sm text-heading">
          <p>{blockedReason}</p>
          {loginHref && (
            <Link href={loginHref} className="font-semibold text-green hover:underline">
              Sign in
            </Link>
          )}
        </div>
      )}

      <div aria-live="polite">{error && <p className="text-sm text-destructive">{error}</p>}</div>

      {comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-2">No comments yet. Be the first member to start the discussion.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green text-sm font-semibold text-primary-foreground"
                aria-hidden="true"
              >
                {initials(c.authorName)}
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-semibold text-heading">{c.authorName}</p>
                  {c.authorRole === "admin" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-xs font-medium text-green">
                      <ShieldCheck className="size-3" aria-hidden="true" /> VAAP Admin
                    </span>
                  )}
                  <time className="text-xs text-muted-2">{c.createdAt}</time>
                  {c.canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      disabled={deletingId === c.id}
                      aria-label="Delete comment"
                      className="ml-auto rounded p-1 text-muted-2 hover:text-destructive disabled:opacity-50"
                    >
                      {deletingId === c.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </button>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-muted-2">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
