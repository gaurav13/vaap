import "server-only"
import { pool } from "@/lib/db"

export const CONVERSATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MESSAGE_ID = /^[\w-]{1,64}$/
/** A pending answer older than this is treated as interrupted and may be retried. */
const PENDING_STALE_MS = 2 * 60_000
/** Deleted conversations are hidden immediately and purged after this many days. */
export const DELETED_RETENTION_DAYS = 30
const MAX_RESTORED_MESSAGES = 200

export type StoredMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  requestId: string | null
  status: "complete" | "pending" | "error"
  createdAt: string
}

export type ConversationSummary = {
  id: string
  title: string
  language: string
  messageCount: number
  lastActivityAt: string
}

export function validMessageId(id: unknown): id is string {
  return typeof id === "string" && MESSAGE_ID.test(id)
}

function titleFrom(question: string) {
  const clean = question.replace(/\s+/g, " ").trim()
  return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean
}

/**
 * Creates the conversation for this user if it is new. Returns false when the id belongs to another
 * user or to a deleted conversation, so a guessed id can never be written to.
 */
export async function claimConversation(id: string, userId: string, question: string, language: string) {
  const { rows } = await pool.query<{ userId: string; status: string }>(
    `insert into ai_conversations (id, "userId", title, language) values ($1, $2, $3, $4)
     on conflict (id) do update set id = ai_conversations.id
     returning "userId", status`,
    [id, userId, titleFrom(question), language],
  )
  return rows[0]?.userId === userId && rows[0]?.status === "active"
}

export type PriorReply =
  | { kind: "none" }
  | { kind: "complete"; content: string; requestId: string | null }
  | { kind: "pending" }
  | { kind: "retry" }

/** Looks up an earlier attempt at the same user message so duplicate requests are not answered or charged twice. */
export async function findPriorReply(conversationId: string, userId: string, userMessageId: string): Promise<PriorReply> {
  const { rows } = await pool.query<{ content: string; requestId: string | null; status: string; updatedAt: Date }>(
    `select a.content, a."requestId", a.status, a."updatedAt"
       from ai_messages u
       left join lateral (
         select content, "requestId", status, "updatedAt" from ai_messages
          where "conversationId" = u."conversationId" and "replyTo" = u.id
          order by seq desc limit 1
       ) a on true
      where u."conversationId" = $1 and u.id = $2 and u."userId" = $3 and u.role = 'user'`,
    [conversationId, userMessageId, userId],
  )
  const row = rows[0]
  if (!row) return { kind: "none" }
  if (row.status === "complete") return { kind: "complete", content: row.content, requestId: row.requestId }
  if (row.status === "pending" && Date.now() - new Date(row.updatedAt).getTime() < PENDING_STALE_MS) return { kind: "pending" }
  return { kind: "retry" }
}

/** Saves the question and a pending answer placeholder before generation starts. */
export async function saveExchangeStart(input: {
  conversationId: string
  userId: string
  userMessageId: string
  question: string
  language: string
  requestId: string
  retry: boolean
}) {
  const client = await pool.connect()
  try {
    await client.query("begin")
    let added = 1
    if (!input.retry) {
      const r = await client.query(
        `insert into ai_messages (id, "conversationId", "userId", role, content, language)
         values ($1, $2, $3, 'user', $4, $5) on conflict ("conversationId", id) do nothing`,
        [input.userMessageId, input.conversationId, input.userId, input.question, input.language],
      )
      added += r.rowCount ?? 0
    }
    await client.query(
      `insert into ai_messages (id, "conversationId", "userId", role, language, "requestId", "replyTo", status)
       values ($1, $2, $3, 'assistant', $4, $1, $5, 'pending') on conflict ("conversationId", id) do nothing`,
      [input.requestId, input.conversationId, input.userId, input.language, input.userMessageId],
    )
    await client.query(
      `update ai_conversations set "lastActivityAt" = now(), language = $2, "messageCount" = "messageCount" + $3 where id = $1`,
      [input.conversationId, input.language, added],
    )
    await client.query("commit")
  } catch (error) {
    await client.query("rollback").catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

export async function saveExchangeEnd(conversationId: string, requestId: string, status: "complete" | "error", content: string) {
  await pool.query(
    `update ai_messages set content = $3, status = $4, "updatedAt" = now() where "conversationId" = $1 and id = $2`,
    [conversationId, requestId, content, status],
  )
  await pool.query(`update ai_conversations set "lastActivityAt" = now() where id = $1`, [conversationId])
}

export async function listConversations(userId: string, limit = 30): Promise<ConversationSummary[]> {
  const { rows } = await pool.query<ConversationSummary & { lastActivityAt: Date }>(
    `select id, title, language, "messageCount", "lastActivityAt" from ai_conversations
      where "userId" = $1 and status = 'active' and "messageCount" > 0
      order by "lastActivityAt" desc limit $2`,
    [userId, limit],
  )
  return rows.map((r) => ({ ...r, lastActivityAt: new Date(r.lastActivityAt).toISOString() }))
}

/** Returns null when the conversation does not exist, is deleted, or belongs to someone else. */
export async function getConversation(id: string, userId: string) {
  const { rows } = await pool.query<ConversationSummary & { lastActivityAt: Date }>(
    `select id, title, language, "messageCount", "lastActivityAt" from ai_conversations
      where id = $1 and "userId" = $2 and status = 'active'`,
    [id, userId],
  )
  if (!rows[0]) return null
  const messages = await pool.query<StoredMessage & { createdAt: Date }>(
    `select * from (
       select seq, id, role, content, "requestId", status, "createdAt" from ai_messages
        where "conversationId" = $1 and "userId" = $2 order by seq desc limit $3
     ) m order by seq asc`,
    [id, userId, MAX_RESTORED_MESSAGES],
  )
  return {
    ...rows[0],
    lastActivityAt: new Date(rows[0].lastActivityAt).toISOString(),
    messages: messages.rows.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      requestId: m.requestId,
      status: m.status,
      createdAt: new Date(m.createdAt).toISOString(),
    })),
  }
}

export async function renameConversation(id: string, userId: string, title: string) {
  const clean = title.replace(/\s+/g, " ").trim().slice(0, 80)
  if (!clean) return false
  const r = await pool.query(`update ai_conversations set title = $3 where id = $1 and "userId" = $2 and status = 'active'`, [id, userId, clean])
  return (r.rowCount ?? 0) > 0
}

export async function deleteConversation(id: string, userId: string) {
  const r = await pool.query(
    `update ai_conversations set status = 'deleted', "deletedAt" = now() where id = $1 and "userId" = $2 and status = 'active'`,
    [id, userId],
  )
  return (r.rowCount ?? 0) > 0
}

export async function purgeDeletedConversations() {
  await pool.query(
    `with gone as (
       delete from ai_conversations where status = 'deleted' and "deletedAt" < now() - make_interval(days => $1) returning id
     ) delete from ai_messages where "conversationId" in (select id from gone)`,
    [DELETED_RETENTION_DAYS],
  )
}

export async function getHistoryStats(since: Date) {
  const { rows } = await pool.query<{ conversations: number; users: number; messages: number }>(
    `select count(*)::int as conversations, count(distinct "userId")::int as users, coalesce(sum("messageCount"), 0)::int as messages
       from ai_conversations where "lastActivityAt" >= $1 and "messageCount" > 0`,
    [since],
  )
  return rows[0] ?? { conversations: 0, users: 0, messages: 0 }
}
