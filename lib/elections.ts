import "server-only"
import crypto from "crypto"
import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  elections,
  electionPositions,
  electionCandidates,
  electionVoterSnapshots,
  electionParticipation,
  electionBallots,
  electionBallotVersions,
  electionResults,
  members,
  xrplAnchors,
} from "@/lib/db/schema"
import {
  ensurePublicId,
  logGovernance,
  enqueueXrplJob,
} from "@/lib/governance"
import { sha256Hex } from "@/lib/xrpl"
import { approvedElectionMemberIds } from "@/lib/voting-rights"

export type ElectionRow = typeof elections.$inferSelect
export type PositionRow = typeof electionPositions.$inferSelect
export type CandidateRow = typeof electionCandidates.$inferSelect

// ---------------------------------------------------------------------------
// Secret ballot cryptography.
//
// Selections are stored AES-256-GCM encrypted so an admin reading the DB can
// tally but cannot casually browse individual choices. The voterTag is a keyed
// HMAC of the member id: it lets us prevent double-voting and support re-voting
// WITHOUT storing a plaintext link between a member and their selections.
// ---------------------------------------------------------------------------

function ballotKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET || "vaap-dev-ballot-secret-fallback-string"
  return crypto.createHash("sha256").update(`ballot:${secret}`).digest()
}

function voterTagKey(): string {
  const secret = process.env.BETTER_AUTH_SECRET || "vaap-dev-ballot-secret-fallback-string"
  return `votertag:${secret}`
}

export function voterTag(electionId: number, memberId: number): string {
  return crypto.createHmac("sha256", voterTagKey()).update(`${electionId}:${memberId}`).digest("hex")
}

export function encryptSelections(selections: unknown): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", ballotKey(), iv)
  const plaintext = Buffer.from(JSON.stringify(selections), "utf8")
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`
}

export function decryptSelections<T = Record<string, number[]>>(payload: string): T | null {
  try {
    const [ivHex, tagHex, dataHex] = payload.split(".")
    const decipher = crypto.createDecipheriv("aes-256-gcm", ballotKey(), Buffer.from(ivHex, "hex"))
    decipher.setAuthTag(Buffer.from(tagHex, "hex"))
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()])
    return JSON.parse(decrypted.toString("utf8")) as T
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listElections(opts?: { statuses?: string[] }) {
  const rows = opts?.statuses?.length
    ? await db.select().from(elections).where(inArray(elections.status, opts.statuses)).orderBy(desc(elections.createdAt))
    : await db.select().from(elections).orderBy(desc(elections.createdAt))
  return rows
}

export async function getElection(id: number) {
  const [election] = await db.select().from(elections).where(eq(elections.id, id)).limit(1)
  if (!election) return null
  const positions = await db
    .select()
    .from(electionPositions)
    .where(eq(electionPositions.electionId, id))
    .orderBy(asc(electionPositions.sortOrder), asc(electionPositions.id))
  const candidates = await db
    .select()
    .from(electionCandidates)
    .where(eq(electionCandidates.electionId, id))
    .orderBy(asc(electionCandidates.sortOrder), asc(electionCandidates.id))
  return { election, positions, candidates }
}

export async function getElectionByReference(reference: string) {
  const [election] = await db.select().from(elections).where(eq(elections.reference, reference)).limit(1)
  if (!election) return null
  return getElection(election.id)
}

// ---------------------------------------------------------------------------
// Admin mutations
// ---------------------------------------------------------------------------

async function nextElectionReference(): Promise<string> {
  const year = new Date().getFullYear()
  const rows = await db.select({ id: elections.id }).from(elections)
  const seq = String(rows.length + 1).padStart(3, "0")
  return `VAAP-ELECTION-${year}-${seq}`
}

export async function createElection(input: {
  title: string
  description?: string
  eligibilityMode?: string
  eligibleCategory?: string
  opensAt?: Date | null
  closesAt?: Date | null
  anchorResultOnXrpl?: boolean
  createdById?: string
  createdByName?: string
  positions: { title: string; description?: string; seats: number }[]
}) {
  const reference = await nextElectionReference()
  const [election] = await db
    .insert(elections)
    .values({
      reference,
      title: input.title,
      description: input.description ?? "",
      eligibilityMode: input.eligibilityMode ?? "all_voting_members",
      eligibleCategory: input.eligibleCategory ?? "",
      opensAt: input.opensAt ?? null,
      closesAt: input.closesAt ?? null,
      anchorResultOnXrpl: input.anchorResultOnXrpl ?? true,
      createdById: input.createdById ?? null,
      createdByName: input.createdByName ?? "",
      status: "draft",
    })
    .returning()

  let sortOrder = 0
  for (const p of input.positions) {
    await db.insert(electionPositions).values({
      electionId: election.id,
      title: p.title,
      description: p.description ?? "",
      seats: Math.max(1, p.seats),
      sortOrder: sortOrder++,
    })
  }

  await logGovernance({
    actorId: input.createdById ?? null,
    actorName: input.createdByName ?? "",
    action: "election.create",
    entityType: "election",
    entityId: election.id,
    detail: reference,
  })
  return election
}

export async function addCandidate(input: {
  electionId: number
  positionId: number
  name: string
  organization?: string
  manifesto?: string
  photo?: string | null
  memberId?: number | null
}) {
  const [candidate] = await db
    .insert(electionCandidates)
    .values({
      electionId: input.electionId,
      positionId: input.positionId,
      name: input.name,
      organization: input.organization ?? "",
      manifesto: input.manifesto ?? "",
      photo: input.photo ?? null,
      memberId: input.memberId ?? null,
    })
    .returning()
  return candidate
}

export async function removeCandidate(candidateId: number) {
  await db.delete(electionCandidates).where(eq(electionCandidates.id, candidateId))
}

export async function setElectionStatus(id: number, status: string, actor?: { id?: string; name?: string }) {
  // When an election opens, freeze the eligible-voter snapshot.
  if (status === "active" || status === "published") {
    await snapshotVoters(id)
  }
  await db.update(elections).set({ status, updatedAt: new Date() }).where(eq(elections.id, id))
  await logGovernance({
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? "",
    action: `election.status.${status}`,
    entityType: "election",
    entityId: id,
    detail: status,
  })
}

// ---------------------------------------------------------------------------
// Eligibility + voter snapshot
// ---------------------------------------------------------------------------

async function eligibleMembers(election: ElectionRow) {
  const base = await db
    .select({
      id: members.id,
      name: members.name,
      membershipId: members.membershipId,
      category: members.category,
      votingEligible: members.votingEligible,
      goodStanding: members.goodStanding,
      status: members.status,
    })
    .from(members)
    .where(eq(members.status, "active"))

  // Only members whose ELECTION voting right has been approved by a
  // super-admin, and who are in good standing, may ever be enrolled.
  const approved = new Set(await approvedElectionMemberIds())
  const votingMembers = base.filter((m) => approved.has(m.id) && m.goodStanding)

  if (election.eligibilityMode === "specific_category" && election.eligibleCategory) {
    return votingMembers.filter((m) => m.category === election.eligibleCategory)
  }
  return votingMembers
}

export async function snapshotVoters(electionId: number) {
  const [election] = await db.select().from(elections).where(eq(elections.id, electionId)).limit(1)
  if (!election) return
  const existing = await db
    .select({ id: electionVoterSnapshots.id })
    .from(electionVoterSnapshots)
    .where(eq(electionVoterSnapshots.electionId, electionId))
    .limit(1)
  if (existing.length > 0) return // snapshot already frozen

  const eligible = await eligibleMembers(election)
  for (const m of eligible) {
    const publicId = await ensurePublicId(m.id)
    await db.insert(electionVoterSnapshots).values({
      electionId,
      memberId: m.id,
      membershipId: m.membershipId ?? "",
      memberName: m.name ?? "",
      publicId,
    })
  }
  await db.update(elections).set({ snapshotAt: new Date() }).where(eq(elections.id, electionId))
}

export async function isVoterEligible(electionId: number, memberId: number): Promise<boolean> {
  const rows = await db
    .select({ id: electionVoterSnapshots.id })
    .from(electionVoterSnapshots)
    .where(and(eq(electionVoterSnapshots.electionId, electionId), eq(electionVoterSnapshots.memberId, memberId)))
    .limit(1)
  return rows.length > 0
}

export async function eligibleVoterCount(electionId: number): Promise<number> {
  const rows = await db
    .select({ id: electionVoterSnapshots.id })
    .from(electionVoterSnapshots)
    .where(eq(electionVoterSnapshots.electionId, electionId))
  return rows.length
}

// ---------------------------------------------------------------------------
// Ballot casting (secret)
// ---------------------------------------------------------------------------

export async function getMemberBallot(electionId: number, memberId: number) {
  const tag = voterTag(electionId, memberId)
  const [ballot] = await db
    .select()
    .from(electionBallots)
    .where(and(eq(electionBallots.electionId, electionId), eq(electionBallots.voterTag, tag), eq(electionBallots.isActive, true)))
    .limit(1)
  return ballot ?? null
}

export type CastBallotInput = {
  electionId: number
  memberId: number
  // positionId -> array of candidateIds chosen (length must be <= seats)
  selections: Record<number, number[]>
}

export async function castBallot(input: CastBallotInput) {
  const detail = await getElection(input.electionId)
  if (!detail) return { ok: false as const, error: "Election not found." }
  const { election, positions, candidates } = detail

  if (election.status !== "active") return { ok: false as const, error: "This election is not open for voting." }
  if (election.closesAt && election.closesAt.getTime() < Date.now())
    return { ok: false as const, error: "Voting has closed for this election." }

  const eligible = await isVoterEligible(input.electionId, input.memberId)
  if (!eligible) return { ok: false as const, error: "You are not on the eligible voter register for this election." }

  // Validate selections against seats and candidate/position integrity.
  for (const pos of positions) {
    const chosen = input.selections[pos.id] ?? []
    if (chosen.length > pos.seats) {
      return { ok: false as const, error: `You selected too many candidates for "${pos.title}".` }
    }
    for (const cid of chosen) {
      const candidate = candidates.find((c) => c.id === cid && c.positionId === pos.id)
      if (!candidate) return { ok: false as const, error: "Invalid candidate selection." }
    }
  }

  const tag = voterTag(input.electionId, input.memberId)
  const encrypted = encryptSelections(input.selections)
  const existing = await getMemberBallot(input.electionId, input.memberId)

  let ballotId: number
  let version = 1
  if (existing) {
    // Re-vote: archive the previous version, then update in place.
    version = existing.version + 1
    await db.insert(electionBallotVersions).values({
      ballotId: existing.id,
      electionId: input.electionId,
      encryptedSelections: existing.encryptedSelections,
      version: existing.version,
    })
    await db
      .update(electionBallots)
      .set({ encryptedSelections: encrypted, version, castAt: new Date() })
      .where(eq(electionBallots.id, existing.id))
    ballotId = existing.id
  } else {
    const ballotToken = `VAAP-BALLOT-${crypto.randomBytes(9).toString("hex").toUpperCase()}`
    const [created] = await db
      .insert(electionBallots)
      .values({
        electionId: input.electionId,
        voterTag: tag,
        ballotToken,
        encryptedSelections: encrypted,
        version: 1,
      })
      .returning()
    ballotId = created.id

    // Record participation (identity-linked, but NOT tied to selections) and
    // anchor the fact of participation to XRPL.
    const [participation] = await db
      .insert(electionParticipation)
      .values({ electionId: input.electionId, memberId: input.memberId })
      .returning()

    if (election.anchorResultOnXrpl) {
      await enqueueXrplJob({
        jobType: "election_participation",
        refTable: "election_participation",
        refId: participation.id,
        payload: { electionId: input.electionId, ref: election.reference },
      })
    }
  }

  const [ballot] = await db.select().from(electionBallots).where(eq(electionBallots.id, ballotId)).limit(1)
  return { ok: true as const, ballotToken: ballot.ballotToken, version }
}

// ---------------------------------------------------------------------------
// Tally + results
// ---------------------------------------------------------------------------

export async function computeElectionResult(electionId: number, actor?: { id?: string; name?: string }) {
  const detail = await getElection(electionId)
  if (!detail) return null
  const { election, positions, candidates } = detail

  const ballots = await db
    .select()
    .from(electionBallots)
    .where(and(eq(electionBallots.electionId, electionId), eq(electionBallots.isActive, true)))

  // Tally: positionId -> candidateId -> count
  const tally = new Map<number, Map<number, number>>()
  for (const pos of positions) tally.set(pos.id, new Map(candidates.filter((c) => c.positionId === pos.id).map((c) => [c.id, 0])))

  for (const ballot of ballots) {
    const selections = decryptSelections<Record<string, number[]>>(ballot.encryptedSelections)
    if (!selections) continue
    for (const [posIdStr, candidateIds] of Object.entries(selections)) {
      const posId = Number(posIdStr)
      const posTally = tally.get(posId)
      if (!posTally) continue
      for (const cid of candidateIds) {
        if (posTally.has(cid)) posTally.set(cid, (posTally.get(cid) ?? 0) + 1)
      }
    }
  }

  // Clear previous results and write fresh ones, marking winners per seat count.
  await db.delete(electionResults).where(eq(electionResults.electionId, electionId))

  const resultLines: { positionId: number; candidateId: number; votes: number; isWinner: boolean }[] = []
  for (const pos of positions) {
    const posTally = tally.get(pos.id)!
    const ranked = [...posTally.entries()].sort((a, b) => b[1] - a[1])
    const winners = new Set(ranked.slice(0, pos.seats).filter(([, v]) => v > 0).map(([cid]) => cid))
    for (const [candidateId, votes] of ranked) {
      resultLines.push({ positionId: pos.id, candidateId, votes, isWinner: winners.has(candidateId) })
    }
  }

  const resultHash = sha256Hex(
    JSON.stringify({ election: election.reference, lines: resultLines, ballots: ballots.length }),
  )

  for (const line of resultLines) {
    await db.insert(electionResults).values({
      electionId,
      positionId: line.positionId,
      candidateId: line.candidateId,
      votes: line.votes,
      isWinner: line.isWinner,
      resultHash,
    })
  }

  await logGovernance({
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? "",
    action: "election.result.compute",
    entityType: "election",
    entityId: electionId,
    detail: `${ballots.length} ballots`,
  })

  return { resultLines, resultHash, totalBallots: ballots.length }
}

export async function publishElectionResult(electionId: number, actor?: { id?: string; name?: string }) {
  const computed = await computeElectionResult(electionId, actor)
  if (!computed) return { ok: false as const, error: "Election not found." }

  const [election] = await db.select().from(elections).where(eq(elections.id, electionId)).limit(1)
  await db.update(elections).set({ status: "results_published", updatedAt: new Date() }).where(eq(elections.id, electionId))

  if (election?.anchorResultOnXrpl) {
    const [anchor] = await db
      .insert(xrplAnchors)
      .values({ anchorType: "election_result", refId: electionId, resultHash: computed.resultHash, status: "pending" })
      .returning()
    await enqueueXrplJob({
      jobType: "result_anchor",
      refTable: "xrpl_anchors",
      refId: anchor.id,
      payload: { type: "election_result", electionId, resultHash: computed.resultHash },
    })
  }

  await logGovernance({
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? "",
    action: "election.result.publish",
    entityType: "election",
    entityId: electionId,
    detail: computed.resultHash,
  })
  return { ok: true as const }
}

export async function getElectionResults(electionId: number) {
  return db
    .select()
    .from(electionResults)
    .where(eq(electionResults.electionId, electionId))
    .orderBy(desc(electionResults.votes))
}

export async function getElectionAnchor(electionId: number) {
  const [anchor] = await db
    .select()
    .from(xrplAnchors)
    .where(and(eq(xrplAnchors.anchorType, "election_result"), eq(xrplAnchors.refId, electionId)))
    .orderBy(desc(xrplAnchors.id))
    .limit(1)
  return anchor ?? null
}

export async function participationCount(electionId: number): Promise<number> {
  const rows = await db
    .select({ id: electionParticipation.id })
    .from(electionParticipation)
    .where(eq(electionParticipation.electionId, electionId))
  return rows.length
}
