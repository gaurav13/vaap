"use server"

import { getSession } from "@/lib/session"
import { revalidatePath } from "next/cache"
import {
  setVotingRight,
  bulkSetVotingRight,
  isVotingStatus,
  type RightKind,
  type VotingStatus,
} from "@/lib/voting-rights"

async function requireSuperAdmin() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  const role = session.user.role
  if (role !== "admin" && role !== "staff") throw new Error("Forbidden")
  return session.user
}

function revalidate() {
  revalidatePath("/admin/governance/voting-rights")
  revalidatePath("/admin/members")
  revalidatePath("/dashboard/governance")
  revalidatePath("/dashboard/elections")
  revalidatePath("/dashboard/voting")
}

function normalizeKind(kind: string): RightKind | null {
  return kind === "election" || kind === "governance" ? kind : null
}

export async function updateVotingRightAction(input: {
  memberId: number
  kind: string
  status: string
  reason?: string
}) {
  let actor
  try {
    actor = await requireSuperAdmin()
  } catch {
    return { ok: false as const, error: "You are not authorized to manage voting rights." }
  }

  const kind = normalizeKind(input.kind)
  if (!kind) return { ok: false as const, error: "Invalid voting category." }
  if (!isVotingStatus(input.status)) return { ok: false as const, error: "Invalid status." }

  const res = await setVotingRight({
    memberId: input.memberId,
    kind,
    status: input.status as VotingStatus,
    actor: { id: actor.id, name: actor.name, role: actor.role },
    reason: input.reason,
  })
  if (!res.ok) return { ok: false as const, error: res.error }
  revalidate()
  return { ok: true as const }
}

export async function bulkUpdateVotingRightAction(input: {
  memberIds: number[]
  kind: string
  status: string
  reason?: string
}) {
  let actor
  try {
    actor = await requireSuperAdmin()
  } catch {
    return { ok: false as const, error: "You are not authorized to manage voting rights." }
  }

  const kind = normalizeKind(input.kind)
  if (!kind) return { ok: false as const, error: "Invalid voting category." }
  if (!isVotingStatus(input.status)) return { ok: false as const, error: "Invalid status." }

  const res = await bulkSetVotingRight({
    memberIds: input.memberIds,
    kind,
    status: input.status as VotingStatus,
    actor: { id: actor.id, name: actor.name, role: actor.role },
    reason: input.reason,
  })
  if (!res.ok) return { ok: false as const, error: res.error }
  revalidate()
  return { ok: true as const, count: res.count }
}
