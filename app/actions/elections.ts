"use server"

import { revalidatePath } from "next/cache"
import { getSession, isStaff } from "@/lib/session"
import {
  createElection,
  addCandidate,
  removeCandidate,
  setElectionStatus,
  publishElectionResult,
  computeElectionResult,
  getElection,
  getMemberBallot,
  castBallot,
} from "@/lib/elections"
import { getMemberByUserId } from "@/lib/governance"
import { hasElectionRight } from "@/lib/voting-rights"

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

function parseDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function createElectionAction(formData: FormData) {
  const user = await requireManager()
  const title = String(formData.get("title") ?? "").trim()
  if (!title) return { ok: false, error: "Title is required." }

  // Positions come in as parallel arrays: positionTitle[], positionSeats[]
  const titles = formData.getAll("positionTitle").map((v) => String(v).trim())
  const seats = formData.getAll("positionSeats").map((v) => num(v, 1))
  const positions = titles
    .map((t, i) => ({ title: t, seats: Math.max(1, seats[i] ?? 1) }))
    .filter((p) => p.title)

  if (positions.length === 0) return { ok: false, error: "Add at least one position." }

  try {
    const election = await createElection({
      title,
      description: String(formData.get("description") ?? "").trim(),
      eligibilityMode: String(formData.get("eligibilityMode") ?? "all_voting_members"),
      eligibleCategory: String(formData.get("eligibleCategory") ?? "").trim(),
      opensAt: parseDate(formData.get("opensAt")),
      closesAt: parseDate(formData.get("closesAt")),
      anchorResultOnXrpl: formData.get("anchorResultOnXrpl") !== "off",
      createdById: user.id,
      createdByName: user.name,
      positions,
    })
    revalidatePath("/admin/elections")
    return { ok: true, id: election.id }
  } catch (e) {
    console.log("[v0] createElectionAction error:", (e as Error).message)
    return { ok: false, error: "Could not create the election." }
  }
}

export async function addCandidateAction(formData: FormData) {
  await requireManager()
  const electionId = num(formData.get("electionId"))
  const positionId = num(formData.get("positionId"))
  const name = String(formData.get("name") ?? "").trim()
  if (!electionId || !positionId || !name) return { ok: false, error: "Name and position are required." }
  try {
    await addCandidate({
      electionId,
      positionId,
      name,
      organization: String(formData.get("organization") ?? "").trim(),
      manifesto: String(formData.get("manifesto") ?? "").trim(),
    })
    revalidatePath(`/admin/elections/${electionId}`)
    return { ok: true }
  } catch (e) {
    console.log("[v0] addCandidateAction error:", (e as Error).message)
    return { ok: false, error: "Could not add the candidate." }
  }
}

export async function removeCandidateAction(candidateId: number, electionId: number) {
  await requireManager()
  try {
    await removeCandidate(candidateId)
    revalidatePath(`/admin/elections/${electionId}`)
    return { ok: true }
  } catch {
    return { ok: false, error: "Could not remove the candidate." }
  }
}

export async function setElectionStatusAction(id: number, status: string) {
  const user = await requireManager()
  try {
    if (status === "results_published") {
      const res = await publishElectionResult(id, { id: user.id, name: user.name })
      if (!res.ok) return res
    } else {
      await setElectionStatus(id, status, { id: user.id, name: user.name })
    }
    revalidatePath("/admin/elections")
    revalidatePath(`/admin/elections/${id}`)
    revalidatePath("/dashboard/elections")
    revalidatePath("/governance/elections")
    return { ok: true }
  } catch (e) {
    console.log("[v0] setElectionStatusAction error:", (e as Error).message)
    return { ok: false, error: "Could not update the election." }
  }
}

export async function recomputeElectionAction(id: number) {
  const user = await requireManager()
  try {
    await computeElectionResult(id, { id: user.id, name: user.name })
    revalidatePath(`/admin/elections/${id}`)
    return { ok: true }
  } catch {
    return { ok: false, error: "Could not recompute results." }
  }
}

export async function castBallotAction(input: { electionId: number; selections: Record<number, number[]> }) {
  const user = await requireMember()
  try {
    const member = await getMemberByUserId(user.id)
    if (!member) return { ok: false, error: "No member profile found." }
    if (!(await hasElectionRight(member.id))) {
      return { ok: false, error: "You do not have election voting rights. Contact VAAP administration." }
    }

    const detail = await getElection(input.electionId)
    if (!detail) return { ok: false, error: "Election not found." }

    const result = await castBallot({
      electionId: input.electionId,
      memberId: member.id,
      selections: input.selections,
    })
    if (!result.ok) return result

    revalidatePath("/dashboard/elections")
    revalidatePath(`/dashboard/elections/${input.electionId}`)
    return { ok: true, ballotToken: result.ballotToken, version: result.version }
  } catch (e) {
    console.log("[v0] castBallotAction error:", (e as Error).message)
    return { ok: false, error: "Could not record your ballot. Please try again." }
  }
}

export async function getMyBallotAction(electionId: number) {
  const user = await requireMember()
  const member = await getMemberByUserId(user.id)
  if (!member) return { ok: false as const, error: "No member profile." }
  const ballot = await getMemberBallot(electionId, member.id)
  return { ok: true as const, hasVoted: !!ballot, ballotToken: ballot?.ballotToken ?? null, version: ballot?.version ?? 0 }
}
