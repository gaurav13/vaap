"use server"

import { revalidatePath } from "next/cache"
import { and, desc, eq, gt } from "drizzle-orm"
import { db } from "@/lib/db"
import { governanceProposalComments, governanceProposalDocuments } from "@/lib/db/schema"
import { getSession, isStaff } from "@/lib/session"
import { getMemberByUserId, getProposal, logGovernance } from "@/lib/governance"
import { MAX_COMMENT_LENGTH } from "@/lib/proposal-extras"
import {
  COMMENT_COOLDOWN_MS,
  COMMENT_DAILY_LIMIT,
  COMMENT_WINDOW_MS,
  formatWait,
  validateCommentText,
} from "@/lib/comment-moderation"

type Result = { ok: true } | { ok: false; error: string }

function refresh(proposalId: number) {
  revalidatePath(`/voting/proposals/${proposalId}`)
  revalidatePath(`/admin/governance/${proposalId}`)
}

export async function deleteProposalDocumentAction(documentId: number): Promise<Result> {
  const session = await getSession()
  if (!session?.user || !isStaff(session.user.role)) return { ok: false, error: "Unauthorized" }

  const [doc] = await db
    .delete(governanceProposalDocuments)
    .where(eq(governanceProposalDocuments.id, documentId))
    .returning()
  if (!doc) return { ok: false, error: "Document not found." }

  await logGovernance({
    actorId: session.user.id,
    actorName: session.user.name,
    actorRole: session.user.role,
    action: "proposal_document_deleted",
    entityType: "proposal",
    entityId: doc.proposalId,
    detail: { documentId: doc.id, title: doc.title },
  })
  refresh(doc.proposalId)
  return { ok: true }
}

export async function postProposalCommentAction(proposalId: number, rawBody: string): Promise<Result> {
  const session = await getSession()
  if (!session?.user) return { ok: false, error: "Sign in to join the discussion." }

  const body = rawBody.replace(/[\u200B-\u200D\uFEFF]/g, "").trim()
  const invalid = validateCommentText(body)
  if (invalid) return { ok: false, error: invalid }
  if (body.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `Comments are limited to ${MAX_COMMENT_LENGTH} characters.` }
  }

  const data = await getProposal(proposalId)
  if (!data || !["active", "published", "closed", "results_published"].includes(data.proposal.status)) {
    return { ok: false, error: "Discussion is not open for this proposal." }
  }

  const staff = isStaff(session.user.role)
  const member = await getMemberByUserId(session.user.id)
  if (!staff && (!member || member.status !== "active")) {
    return { ok: false, error: "Only active VAAP members can take part in the discussion." }
  }

  if (!staff) {
    const now = Date.now()
    const recent = await db
      .select({ createdAt: governanceProposalComments.createdAt })
      .from(governanceProposalComments)
      .where(
        and(
          eq(governanceProposalComments.userId, session.user.id),
          gt(governanceProposalComments.createdAt, new Date(now - COMMENT_WINDOW_MS)),
        ),
      )
      .orderBy(desc(governanceProposalComments.createdAt))

    const last = recent[0]?.createdAt ? new Date(recent[0].createdAt).getTime() : null
    if (last && now - last < COMMENT_COOLDOWN_MS) {
      return {
        ok: false,
        error: `You can post one comment per hour. Please try again in ${formatWait(COMMENT_COOLDOWN_MS - (now - last))}.`,
      }
    }
    if (recent.length >= COMMENT_DAILY_LIMIT) {
      const oldest = new Date(recent[recent.length - 1].createdAt).getTime()
      return {
        ok: false,
        error: `You have reached the limit of ${COMMENT_DAILY_LIMIT} comments in 24 hours. Try again in ${formatWait(COMMENT_WINDOW_MS - (now - oldest))}.`,
      }
    }
  }

  await db.insert(governanceProposalComments).values({
    proposalId,
    userId: session.user.id,
    memberId: member?.id ?? null,
    authorName: member?.name || session.user.name || "Member",
    authorRole: staff ? "admin" : "member",
    body,
  })
  refresh(proposalId)
  return { ok: true }
}

export async function deleteProposalCommentAction(commentId: number): Promise<Result> {
  const session = await getSession()
  if (!session?.user) return { ok: false, error: "Unauthorized" }

  const [comment] = await db
    .select()
    .from(governanceProposalComments)
    .where(eq(governanceProposalComments.id, commentId))
    .limit(1)
  if (!comment) return { ok: false, error: "Comment not found." }

  const staff = isStaff(session.user.role)
  if (!staff && comment.userId !== session.user.id) return { ok: false, error: "You can only delete your own comments." }

  await db.delete(governanceProposalComments).where(eq(governanceProposalComments.id, commentId))
  if (staff && comment.userId !== session.user.id) {
    await logGovernance({
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role,
      action: "proposal_comment_removed",
      entityType: "proposal",
      entityId: comment.proposalId,
      detail: { commentId, author: comment.authorName },
    })
  }
  refresh(comment.proposalId)
  return { ok: true }
}
