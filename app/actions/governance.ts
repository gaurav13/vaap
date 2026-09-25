"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { getSession, isAdmin, isStaff } from "@/lib/session"
import { governanceProposals, xrplAnchors } from "@/lib/db/schema"
import {
  createProposal,
  setProposalStatus,
  getProposal,
  getMemberByUserId,
  getMemberVote,
  isMemberEligible,
  castVote,
  computeProposalResult,
  enqueueXrplJob,
  logGovernance,
  ensurePublicId,
} from "@/lib/governance"
import { hasGovernanceRight } from "@/lib/voting-rights"

async function requireManager() {
  const session = await getSession()
  if (!session?.user || !isStaff(session.user.role)) throw new Error("Unauthorized")
  return session.user
}

async function requireMember() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  return session.user
}

function num(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export async function createProposalAction(formData: FormData) {
  const user = await requireManager()
  const title = String(formData.get("title") ?? "").trim()
  if (!title) return { ok: false, error: "Title is required." }

  const voteType = String(formData.get("voteType") ?? "yes_no_abstain")
  const optionsRaw = String(formData.get("options") ?? "")
  const options = optionsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)

  try {
    const proposal = await createProposal({
      title,
      summary: String(formData.get("summary") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      category: String(formData.get("category") ?? "Resolution"),
      voteType,
      visibility: String(formData.get("visibility") ?? "open"),
      eligibilityMode: String(formData.get("eligibilityMode") ?? "all_voting_members"),
      eligibleCategory: String(formData.get("eligibleCategory") ?? "").trim(),
      quorum: num(formData.get("quorum")),
      passThreshold: num(formData.get("passThreshold"), 50),
      recordIndividualVotesOnXrpl: formData.get("recordIndividualVotesOnXrpl") === "on",
      anchorResultOnXrpl: formData.get("anchorResultOnXrpl") !== "off",
      options,
      createdById: user.id,
      createdByName: user.name,
    })
    await logGovernance({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "proposal.create",
      entityType: "proposal",
      entityId: proposal.id,
      detail: { title, voteType },
    })
    revalidatePath("/admin/governance")
    return { ok: true, id: proposal.id }
  } catch (e) {
    console.log("[v0] createProposalAction error:", (e as Error).message)
    return { ok: false, error: "Could not create the proposal." }
  }
}

export async function setProposalStatusAction(id: number, status: string) {
  const user = await requireManager()
  try {
    if (status === "closed") {
      const result = await computeProposalResult(id)
      await setProposalStatus(id, "closed")
      const data = await getProposal(id)
      if (data?.proposal.anchorResultOnXrpl && result.resultHash) {
        await db
          .insert(xrplAnchors)
          .values({ anchorType: "proposal_result", refId: id, resultHash: result.resultHash, status: "pending" })
        await enqueueXrplJob({
          jobType: "result_anchor",
          refTable: "governance_proposals",
          refId: id,
          payload: { resultHash: result.resultHash, ref: data.proposal.reference },
        })
      }
    } else {
      await setProposalStatus(id, status)
    }
    await logGovernance({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: `proposal.${status}`,
      entityType: "proposal",
      entityId: id,
    })
    revalidatePath("/admin/governance")
    revalidatePath(`/admin/governance/${id}`)
    revalidatePath("/dashboard/governance")
    revalidatePath("/voting/register")
    return { ok: true }
  } catch (e) {
    console.log("[v0] setProposalStatusAction error:", (e as Error).message)
    return { ok: false, error: "Could not update the proposal." }
  }
}

export async function recomputeResultAction(id: number) {
  await requireManager()
  try {
    await computeProposalResult(id)
    revalidatePath(`/admin/governance/${id}`)
    return { ok: true }
  } catch {
    return { ok: false, error: "Could not recompute the result." }
  }
}

export async function castVoteAction(input: { proposalId: number; choice: string; optionId?: number | null }) {
  const user = await requireMember()
  try {
    const member = await getMemberByUserId(user.id)
    if (!member) return { ok: false, error: "No member profile found." }
    if (member.status !== "active") {
      return { ok: false, error: "You are not currently eligible to vote." }
    }
    if (!(await hasGovernanceRight(member.id))) {
      return { ok: false, error: "You do not have governance voting rights. Contact VAAP administration." }
    }
    const data = await getProposal(input.proposalId)
    if (!data) return { ok: false, error: "Proposal not found." }
    if (data.proposal.status !== "active") return { ok: false, error: "This vote is not open." }
    // Server-side close-time enforcement (independent of the client countdown).
    if (data.proposal.closesAt && data.proposal.closesAt.getTime() < Date.now()) {
      return { ok: false, error: "Voting has closed for this proposal." }
    }

    const eligible = await isMemberEligible(data.proposal, member.id)
    if (!eligible) return { ok: false, error: "You are not on the eligibility list for this vote." }

    // Duplicate votes are blocked unless the proposal allows vote changes.
    const existingVote = await getMemberVote(input.proposalId, member.id)
    if (existingVote && !data.proposal.allowVoteChanges) {
      return { ok: false, error: "You have already voted on this proposal." }
    }

    // Validate choice against the vote type.
    if (data.proposal.voteType === "yes_no_abstain") {
      if (!["yes", "no", "abstain"].includes(input.choice)) return { ok: false, error: "Invalid choice." }
    } else {
      if (input.choice !== "option" || !input.optionId) return { ok: false, error: "Select an option." }
      if (!data.options.some((o) => o.id === input.optionId)) return { ok: false, error: "Invalid option." }
    }

    const { receiptCode } = await castVote({
      proposal: data.proposal,
      memberId: member.id,
      choice: input.choice,
      optionId: input.optionId ?? null,
    })
    await ensurePublicId(member.id)
    await logGovernance({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "vote.cast",
      entityType: "proposal",
      entityId: input.proposalId,
      detail: { version: true },
    })
    revalidatePath("/dashboard/governance")
    revalidatePath(`/dashboard/governance/${input.proposalId}`)
    revalidatePath("/voting")
    revalidatePath("/voting/active")
    revalidatePath("/voting/results")
    revalidatePath("/voting/proposals")
    revalidatePath(`/voting/proposals/${input.proposalId}`)
    return { ok: true, receiptCode }
  } catch (e) {
    console.log("[v0] castVoteAction error:", (e as Error).message)
    return { ok: false, error: "Could not record your vote. Please try again." }
  }
}

export async function grantProposeAction(_id: number) {
  // reserved for future per-member proposing rights UI
  await requireManager()
  return { ok: true }
}
