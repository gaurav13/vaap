// Pure name matching for the assistant's people lookup. No DB access, so it can be unit-tested.

export type PersonGroup = "leadership" | "advisory" | "industry" | "kol"

export type PublicPerson = {
  name: string
  group: PersonGroup
  role: string
  organization: string
  summary: string
  link: string
  aliases?: string[]
  verification?: { status: "verified"; validUntil: string | null }
}

export type PersonMatch =
  | { listed: true; ambiguous: false; person: PublicPerson }
  | { listed: true; ambiguous: true; candidates: PublicPerson[] }
  | { listed: false }

/** Spelling variants and Urdu-script names that should resolve to the same person. */
export const NAME_ALIASES: Record<string, string[]> = {
  hinza: ["hinza asif", "hinza aasif", "hinza asaf", "hinza asf", "ہنزہ", "ہنزہ آصف", "حنزہ آصف"],
  ehtesham: ["syed ehtesham hamdani", "ehtesham hamdani", "ehtisham", "ehtisham hamdani", "ihtesham", "احتشام", "احتشام ہمدانی"],
}

const ROLE_PHRASES: { re: RegExp; role: string }[] = [
  { re: /\b(sr\.?|senior)\s*vice\s*chair(man|person|woman)?\b|سینئر\s*وائس/i, role: "sr. vice chairman" },
  { re: /\bvice\s*chair(man|person|woman)?\b|وائس\s*چیئر/i, role: "vice chairman" },
  { re: /\bchair(man|person|woman)?\b|\bpresident\b|چیئرمین|چیئرپرسن|صدر/i, role: "chairman" },
]

export function normalizeName(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|dr|prof|engr|syed|sayed|muhammad|mohammad|m)\.?\s+/g, (m) => (m.startsWith("syed") ? "syed " : ""))
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function editDistance(a: string, b: string) {
  if (a === b) return 0
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

/** Detects a role phrase like "chairperson" or "senior vice chairman" in a query. */
export function roleFromQuery(query: string) {
  return ROLE_PHRASES.find((r) => r.re.test(query))?.role ?? null
}

function namesFor(p: PublicPerson) {
  const base = normalizeName(p.name)
  const extra = (p.aliases ?? []).map(normalizeName)
  for (const [key, list] of Object.entries(NAME_ALIASES)) {
    if (base.includes(key) || list.some((a) => normalizeName(a) === base)) extra.push(...list.map(normalizeName))
  }
  return [base, ...extra]
}

function tokenScore(q: string, name: string) {
  const qt = q.split(" ").filter((t) => t.length > 1)
  const nt = name.split(" ")
  if (!qt.length) return 0
  let hit = 0
  for (const t of qt) {
    const tol = t.length >= 7 ? 2 : t.length >= 4 ? 1 : 0
    if (nt.some((n) => n === t || n.startsWith(t) || (tol && editDistance(n, t) <= tol))) hit++
  }
  return hit / qt.length
}

/** Scores 0..1 how well a free-text query names a person. */
export function scorePerson(query: string, p: PublicPerson) {
  const q = normalizeName(query)
  if (!q) return 0
  let best = 0
  for (const n of namesFor(p)) {
    if (n === q) return 1
    if (n.includes(q) && q.length >= 4) best = Math.max(best, 0.9)
    if (q.includes(n) && n.length >= 4) best = Math.max(best, 0.95)
    const d = editDistance(q, n)
    if (d <= Math.max(1, Math.floor(n.length / 6))) best = Math.max(best, 0.85)
    best = Math.max(best, tokenScore(q, n) * 0.8)
  }
  return best
}

/**
 * Finds a published person by name or role. Several close matches come back as ambiguous so the
 * assistant asks which person; no match returns listed:false so nobody is ever claimed as verified.
 */
export function matchPerson(query: string, people: PublicPerson[], group?: PersonGroup): PersonMatch {
  const pool = group ? people.filter((p) => p.group === group) : people
  const role = roleFromQuery(query)
  const nameQuery = query.replace(/\b(who\s+is|kon\s+hai|kaun\s+hai|the|of|vaap|is|kya)\b/gi, " ")

  const scored = pool
    .map((p) => ({ p, s: scorePerson(nameQuery, p) }))
    .filter((x) => x.s >= 0.6)
    .sort((a, b) => b.s - a.s)

  if (!scored.length && role) {
    const byRole = pool.filter((p) => normalizeName(p.role).replace(/person|woman/g, "man") === role)
    if (byRole.length === 1) return { listed: true, ambiguous: false, person: byRole[0] }
    if (byRole.length > 1) return { listed: true, ambiguous: true, candidates: byRole.slice(0, 5) }
  }
  if (!scored.length) return { listed: false }
  const top = scored[0]
  const close = scored.filter((x) => top.s - x.s < 0.08 && x.p.name !== top.p.name)
  if (top.s >= 0.95 || close.length === 0) return { listed: true, ambiguous: false, person: top.p }
  return { listed: true, ambiguous: true, candidates: [top, ...close].slice(0, 5).map((x) => x.p) }
}
