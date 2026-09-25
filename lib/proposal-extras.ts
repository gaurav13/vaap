import { asc, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { governanceProposalComments, governanceProposalDocuments } from "@/lib/db/schema"

export type ProposalDocument = typeof governanceProposalDocuments.$inferSelect
export type ProposalComment = typeof governanceProposalComments.$inferSelect

export const MAX_COMMENT_LENGTH = 2000

export async function listProposalDocuments(proposalId: number) {
  return db
    .select()
    .from(governanceProposalDocuments)
    .where(eq(governanceProposalDocuments.proposalId, proposalId))
    .orderBy(desc(governanceProposalDocuments.createdAt))
}

export async function getProposalDocument(id: number) {
  const rows = await db.select().from(governanceProposalDocuments).where(eq(governanceProposalDocuments.id, id)).limit(1)
  return rows[0] ?? null
}

export async function listProposalComments(proposalId: number) {
  return db
    .select()
    .from(governanceProposalComments)
    .where(eq(governanceProposalComments.proposalId, proposalId))
    .orderBy(asc(governanceProposalComments.createdAt))
}

export async function countProposalComments(proposalId: number) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(governanceProposalComments)
    .where(eq(governanceProposalComments.proposalId, proposalId))
  return row?.n ?? 0
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
