import "server-only"

import { pool } from "@/lib/db"

export const RANGES = ["day", "week", "month", "all"] as const
export type Range = (typeof RANGES)[number]

/** 1 internal VAAP credit = USD 0.001 of estimated model cost. Not a provider credit. */
export const MICRO_USD_PER_CREDIT = 1000

const SINCE: Record<Range, string> = {
  day: `date_trunc('day', now())`,
  week: `now() - interval '7 days'`,
  month: `date_trunc('month', now())`,
  all: `'epoch'::timestamp`,
}

export const parseRange = (v: unknown): Range => (RANGES.includes(v as Range) ? (v as Range) : "month")

const n = (v: unknown) => Number(v ?? 0)
const PAID = `coalesce(l."actualCostMicroUsd", l."costMicroUsd")`
const WHO = `coalesce(l."userId", 'guest:' || l."sessionId")`

export async function getOverview(range: Range) {
  const since = SINCE[range]
  const [{ rows: u }, { rows: f }, { rows: c }] = await Promise.all([
    pool.query(`
      select
        count(distinct ${WHO}) as users,
        count(distinct l."userId") as registered,
        count(distinct l."sessionId") filter (where l."userId" is null) as guests,
        count(distinct coalesce(l."conversationId", l."sessionId")) as conversations,
        count(*) filter (where l.question <> '') as questions,
        count(*) as requests,
        count(*) filter (where l.status = 'ok') as ok,
        count(*) filter (where l.status = 'error') as failed,
        count(*) filter (where l.status like 'blocked%' or l.status in ('disabled','free_fallback')) as blocked,
        coalesce(sum(l."inputTokens"), 0) as input,
        coalesce(sum(l."outputTokens"), 0) as output,
        coalesce(sum(l."cachedInputTokens"), 0) as cached,
        coalesce(sum(l."costMicroUsd"), 0) as estimated,
        coalesce(sum(l."actualCostMicroUsd"), 0) as actual,
        count(l."actualCostMicroUsd") as reconciled,
        coalesce(sum(${PAID}), 0) as spend,
        count(*) filter (where l.answered = false) as unanswered
      from ai_usage_logs l where l."createdAt" >= ${since}`),
    pool.query(`
      select count(*) filter (where rating > 0) as up, count(*) filter (where rating < 0) as down
      from ai_feedback where "createdAt" >= ${since}`),
    pool.query(`
      select count(*) filter (where status = 'approved') as approved, count(*) filter (where status = 'pending') as pending
      from ai_answer_corrections`),
  ])
  const r = u[0]
  const up = n(f[0]?.up)
  const down = n(f[0]?.down)
  return {
    users: n(r.users),
    registered: n(r.registered),
    guests: n(r.guests),
    conversations: n(r.conversations),
    questions: n(r.questions),
    requests: n(r.requests),
    ok: n(r.ok),
    failed: n(r.failed),
    blocked: n(r.blocked),
    inputTokens: n(r.input),
    outputTokens: n(r.output),
    cachedTokens: n(r.cached),
    estimatedMicroUsd: n(r.estimated),
    actualMicroUsd: n(r.actual),
    reconciled: n(r.reconciled),
    spendMicroUsd: n(r.spend),
    unanswered: n(r.unanswered),
    feedbackUp: up,
    feedbackDown: down,
    satisfaction: up + down > 0 ? Math.round((up / (up + down)) * 100) : null,
    approvedCorrections: n(c[0]?.approved),
    pendingCorrections: n(c[0]?.pending),
  }
}

export async function getDailySeries(days = 30) {
  const { rows } = await pool.query(
    `
    select to_char(d, 'YYYY-MM-DD') as day,
      coalesce(sum(l."costMicroUsd"), 0) as estimated,
      coalesce(sum(l."actualCostMicroUsd"), 0) as actual,
      coalesce(sum(l."inputTokens"), 0) as input,
      coalesce(sum(l."outputTokens"), 0) as output,
      count(l.id) as requests
    from generate_series(date_trunc('day', now()) - ($1::int - 1) * interval '1 day', date_trunc('day', now()), interval '1 day') d
    left join ai_usage_logs l on date_trunc('day', l."createdAt") = d
    group by d order by d`,
    [days],
  )
  return rows.map((r) => ({
    day: r.day as string,
    estimatedUsd: n(r.estimated) / 1e6,
    actualUsd: n(r.actual) / 1e6,
    input: n(r.input),
    output: n(r.output),
    requests: n(r.requests),
  }))
}

export async function getMonthlySeries(months = 12) {
  const { rows } = await pool.query(
    `
    select to_char(m, 'YYYY-MM') as month,
      coalesce(sum(l."costMicroUsd"), 0) as estimated,
      coalesce(sum(l."actualCostMicroUsd"), 0) as actual,
      count(l.id) as requests
    from generate_series(date_trunc('month', now()) - ($1::int - 1) * interval '1 month', date_trunc('month', now()), interval '1 month') m
    left join ai_usage_logs l on date_trunc('month', l."createdAt") = m
    group by m order by m`,
    [months],
  )
  return rows.map((r) => ({ month: r.month as string, estimatedUsd: n(r.estimated) / 1e6, actualUsd: n(r.actual) / 1e6, requests: n(r.requests) }))
}

export async function getModelBreakdown(range: Range) {
  const { rows } = await pool.query(`
    select l.model, l.provider, count(*) as requests,
      coalesce(sum(l."inputTokens"), 0) as input, coalesce(sum(l."outputTokens"), 0) as output,
      coalesce(sum(l."cachedInputTokens"), 0) as cached,
      coalesce(sum(l."costMicroUsd"), 0) as estimated, coalesce(sum(l."actualCostMicroUsd"), 0) as actual
    from ai_usage_logs l where l."createdAt" >= ${SINCE[range]} and l.model <> ''
    group by l.model, l.provider order by estimated desc`)
  return rows.map((r) => ({
    model: r.model as string,
    provider: (r.provider as string) || "AI Gateway",
    requests: n(r.requests),
    input: n(r.input),
    output: n(r.output),
    cached: n(r.cached),
    estimatedUsd: n(r.estimated) / 1e6,
    actualUsd: n(r.actual) / 1e6,
  }))
}

export type RequestRow = Awaited<ReturnType<typeof getRequests>>["rows"][number]

export async function getRequests(opts: { range: Range; status?: string; page?: number; q?: string; pageSize?: number }) {
  const pageSize = opts.pageSize ?? 25
  const page = Math.max(1, opts.page ?? 1)
  const params: unknown[] = []
  const where = [`l."createdAt" >= ${SINCE[opts.range]}`]
  if (opts.status) {
    params.push(opts.status)
    where.push(`l.status = $${params.length}`)
  }
  if (opts.q) {
    params.push(`%${opts.q}%`)
    where.push(`(l.question ilike $${params.length} or l.answer ilike $${params.length})`)
  }
  params.push(pageSize, (page - 1) * pageSize)
  const { rows } = await pool.query(
    `
    select l.id, l."requestId", l."createdAt", l."userId", l."sessionId", l."conversationId", l.provider, l.model,
      l."inputTokens", l."outputTokens", l."cachedInputTokens", l."costMicroUsd", l."actualCostMicroUsd",
      l.status, l.language, l.topic, l.question, l.answer, l.answered, l."latencyMs", l."errorMessage",
      f.rating, count(*) over () as total,
      exists (select 1 from ai_answer_corrections c where c."usageLogId" = l.id and c.status = 'approved') as corrected
    from ai_usage_logs l
    left join ai_feedback f on f."messageId" = l."messageId"
    where ${where.join(" and ")}
    order by l."createdAt" desc
    limit $${params.length - 1} offset $${params.length}`,
    params,
  )
  return {
    total: n(rows[0]?.total),
    page,
    pageSize,
    rows: rows.map((r) => ({
      id: n(r.id),
      requestId: r.requestId as string,
      createdAt: (r.createdAt as Date).toISOString(),
      userId: (r.userId as string | null) ?? null,
      sessionId: r.sessionId as string,
      conversationId: (r.conversationId as string | null) ?? null,
      provider: (r.provider as string) || "AI Gateway",
      model: r.model as string,
      inputTokens: n(r.inputTokens),
      outputTokens: n(r.outputTokens),
      cachedTokens: n(r.cachedInputTokens),
      estimatedMicroUsd: n(r.costMicroUsd),
      actualMicroUsd: r.actualCostMicroUsd == null ? null : n(r.actualCostMicroUsd),
      status: r.status as string,
      language: r.language as string,
      topic: r.topic as string,
      question: r.question as string,
      answer: r.answer as string,
      answered: r.answered as boolean | null,
      latencyMs: n(r.latencyMs),
      errorMessage: r.errorMessage as string,
      rating: r.rating == null ? null : n(r.rating),
      corrected: Boolean(r.corrected),
    })),
  }
}

export async function getUserUsage(range: Range, limit = 50) {
  const { rows } = await pool.query(
    `
    select ${WHO} as who, l."userId" is not null as registered, max(u.name) as name, max(u.email) as email,
      count(*) filter (where l.question <> '') as questions,
      count(distinct coalesce(l."conversationId", l."sessionId")) as conversations,
      coalesce(sum(l."inputTokens" + l."outputTokens"), 0) as tokens,
      coalesce(sum(${PAID}), 0) as spend,
      max(l."createdAt") as last
    from ai_usage_logs l left join "user" u on u.id = l."userId"
    where l."createdAt" >= ${SINCE[range]}
    group by 1, 2 order by spend desc, questions desc limit $1`,
    [limit],
  )
  return rows.map((r) => ({
    who: r.who as string,
    registered: Boolean(r.registered),
    name: (r.name as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    questions: n(r.questions),
    conversations: n(r.conversations),
    tokens: n(r.tokens),
    spendUsd: n(r.spend) / 1e6,
    last: (r.last as Date).toISOString(),
  }))
}

export async function getTopQuestions(range: Range, limit = 15) {
  const { rows } = await pool.query(
    `
    select min(l.question) as question, count(*) as asks, count(*) filter (where l.answered = false) as unanswered,
      max(l."createdAt") as last, min(l.topic) as topic
    from ai_usage_logs l where l.question <> '' and l."createdAt" >= ${SINCE[range]}
    group by lower(regexp_replace(trim(l.question), '[[:punct:][:space:]]+', ' ', 'g'))
    order by asks desc, last desc limit $1`,
    [limit],
  )
  return rows.map((r) => ({
    question: r.question as string,
    asks: n(r.asks),
    unanswered: n(r.unanswered),
    topic: r.topic as string,
    last: (r.last as Date).toISOString(),
  }))
}

export async function getTopics(range: Range) {
  const { rows } = await pool.query(`
    select l.topic, count(*) as asks, count(*) filter (where l.answered = false) as unanswered
    from ai_usage_logs l where l.question <> '' and l."createdAt" >= ${SINCE[range]}
    group by l.topic order by asks desc`)
  return rows.map((r) => ({ topic: r.topic as string, asks: n(r.asks), unanswered: n(r.unanswered) }))
}

export async function getUnanswered(limit = 30) {
  const { rows } = await pool.query(
    `
    select l.id, l.question, l.answer, l.topic, l."createdAt"
    from ai_usage_logs l
    where l.answered = false and l.question <> ''
      and not exists (select 1 from ai_answer_corrections c where c."usageLogId" = l.id and c.status in ('approved','pending'))
    order by l."createdAt" desc limit $1`,
    [limit],
  )
  return rows.map((r) => ({
    id: n(r.id),
    question: r.question as string,
    answer: r.answer as string,
    topic: r.topic as string,
    createdAt: (r.createdAt as Date).toISOString(),
  }))
}

export async function getFeedback(limit = 30) {
  const { rows } = await pool.query(
    `
    select f.id, f.rating, f.comment, f.question, f."createdAt", f.resolved, l.id as "usageLogId", l.answer
    from ai_feedback f left join ai_usage_logs l on l."messageId" = f."messageId"
    order by f.rating asc, f."createdAt" desc limit $1`,
    [limit],
  )
  return rows.map((r) => ({
    id: n(r.id),
    rating: n(r.rating),
    comment: r.comment as string,
    question: r.question as string,
    answer: (r.answer as string | null) ?? "",
    usageLogId: r.usageLogId == null ? null : n(r.usageLogId),
    resolved: Boolean(r.resolved),
    createdAt: (r.createdAt as Date).toISOString(),
  }))
}

const STOPWORDS = new Set(
  "a an and are as at be by can do does for from has have how i if in is it its me my of on or our the this to was what when where which who why will with you your vaap please tell about kya hai ka ki ke ko se mein main aur".split(" "),
)

export async function getTrendingKeywords(limit = 20) {
  const { rows } = await pool.query(`
    select l.question, l."createdAt" >= now() - interval '7 days' as recent
    from ai_usage_logs l where l.question <> '' and l."createdAt" >= now() - interval '30 days'`)
  const counts = new Map<string, { recent: number; total: number }>()
  for (const r of rows) {
    const words = new Set(
      String(r.question)
        .toLowerCase()
        .match(/[\p{L}\p{N}]{3,}/gu) ?? [],
    )
    for (const w of words) {
      if (STOPWORDS.has(w)) continue
      const c = counts.get(w) ?? { recent: 0, total: 0 }
      c.total++
      if (r.recent) c.recent++
      counts.set(w, c)
    }
  }
  return [...counts.entries()]
    .map(([word, c]) => ({ word, ...c }))
    .sort((a, b) => b.recent - a.recent || b.total - a.total)
    .slice(0, limit)
}

export async function getKnowledgeAssessment() {
  const [{ rows: cats }, { rows: topics }, { rows: corr }] = await Promise.all([
    pool.query(`
      select category,
        count(*) filter (where status = 'approved' and active) as live,
        count(*) filter (where status = 'pending') as pending,
        count(*) filter (where status = 'approved' and active and "updatedAt" < now() - interval '180 days') as stale,
        max("updatedAt") filter (where status = 'approved' and active) as freshest
      from ai_knowledge_sources group by category order by category`),
    pool.query(`
      select l.topic, count(*) as asks, count(*) filter (where l.answered = false) as unanswered,
        count(*) filter (where f.rating < 0) as negative
      from ai_usage_logs l left join ai_feedback f on f."messageId" = l."messageId"
      where l.question <> '' and l."createdAt" >= now() - interval '90 days'
      group by l.topic order by asks desc`),
    pool.query(`
      select c.topic, count(*) as corrections,
        count(*) filter (where exists (
          select 1 from ai_usage_logs l where l.topic = c.topic and l."createdAt" > c."reviewedAt" and l.answered = false
        )) as still_failing
      from ai_answer_corrections c where c.status = 'approved' group by c.topic`),
  ])
  return {
    categories: cats.map((r) => ({
      category: r.category as string,
      live: n(r.live),
      pending: n(r.pending),
      stale: n(r.stale),
      freshest: r.freshest ? (r.freshest as Date).toISOString() : null,
    })),
    topics: topics.map((r) => ({ topic: r.topic as string, asks: n(r.asks), unanswered: n(r.unanswered), negative: n(r.negative) })),
    corrections: corr.map((r) => ({ topic: r.topic as string, corrections: n(r.corrections), stillFailing: n(r.still_failing) })),
  }
}

export async function getPendingKnowledge() {
  const { rows } = await pool.query(`
    select id, title, kind, category, "sourceUrl", "fileName", "charCount", "createdAt", left(content, 600) as preview
    from ai_knowledge_sources where status = 'pending' order by "createdAt" desc limit 50`)
  return rows.map((r) => ({
    id: n(r.id),
    title: r.title as string,
    kind: r.kind as string,
    category: r.category as string,
    sourceUrl: (r.sourceUrl as string | null) ?? null,
    fileName: (r.fileName as string | null) ?? null,
    charCount: n(r.charCount),
    createdAt: (r.createdAt as Date).toISOString(),
    preview: r.preview as string,
  }))
}

export async function getCorrections(status?: string) {
  const params: unknown[] = []
  let where = ""
  if (status) {
    params.push(status)
    where = `where status = $1`
  }
  const { rows } = await pool.query(
    `select id, question, "originalAnswer", "correctedAnswer", keywords, topic, status, version, "createdByName",
       "reviewNote", "createdAt", "updatedAt", "usageLogId"
     from ai_answer_corrections ${where} order by "updatedAt" desc limit 100`,
    params,
  )
  return rows.map((r) => ({
    id: n(r.id),
    question: r.question as string,
    originalAnswer: r.originalAnswer as string,
    correctedAnswer: r.correctedAnswer as string,
    keywords: r.keywords as string,
    topic: r.topic as string,
    status: r.status as string,
    version: n(r.version),
    createdByName: r.createdByName as string,
    reviewNote: r.reviewNote as string,
    usageLogId: r.usageLogId == null ? null : n(r.usageLogId),
    updatedAt: (r.updatedAt as Date).toISOString(),
  }))
}

export async function getAiAuditLog(limit = 100) {
  const { rows } = await pool.query(
    `
    (select 'admin' as kind, a.id::text as id, a."createdAt", a."actorName" as actor, a."actorRole" as role, a.action, a.target, a.details
     from audit_logs a where a.action like 'ai\\_%' or a."entityType" like 'ai\\_%')
    union all
    (select 'request' as kind, l."requestId", l."createdAt", coalesce(l."userId", 'guest') as actor, '' as role,
       'ai_request.' || l.status as action, l.model as target, left(l."errorMessage", 300) as details
     from ai_usage_logs l where l.status <> 'ok')
    order by "createdAt" desc limit $1`,
    [limit],
  )
  return rows.map((r) => ({
    kind: r.kind as "admin" | "request",
    id: r.id as string,
    createdAt: (r.createdAt as Date).toISOString(),
    actor: r.actor as string,
    role: r.role as string,
    action: r.action as string,
    target: r.target as string,
    details: r.details as string,
  }))
}

export async function getBudgetAlerts() {
  const { rows } = await pool.query(`select period, threshold, "spentMicroUsd", "sentAt" from ai_budget_alerts order by "sentAt" desc limit 20`)
  return rows.map((r) => ({
    period: r.period as string,
    threshold: n(r.threshold),
    spentUsd: n(r.spentMicroUsd) / 1e6,
    sentAt: (r.sentAt as Date).toISOString(),
  }))
}
