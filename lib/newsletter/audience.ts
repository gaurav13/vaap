import "server-only"
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import { emailSuppressions, members, membershipApplications, newsletterSubscribers, user, type NewsletterAudience } from "@/lib/db/schema"
import { isIssuedMembership } from "@/lib/membership-state"
import { AUDIENCE_GROUPS, EMAIL_RE, describeSelection, type AudienceGroup, type AudienceSelection } from "@/lib/newsletter/content"

export const NEWSLETTER_TOPIC = "newsletter"
const lower = (s: string | null | undefined) => (s ?? "").trim().toLowerCase()

type Approval = "pending" | "approved" | "rejected" | "incomplete" | null

/** One person, keyed by email. Payment and approval are tracked independently. */
export type Contact = {
  email: string
  name: string
  isMember: boolean
  paid: boolean
  approval: Approval
  plan: string | null
  /** Opted in to VAAP newsletters (counts as marketing consent). */
  subscribed: boolean
  manual?: boolean
}

export type ResolvedRecipient = Contact & { statusLabel: string }

export type AudienceReport = {
  label: string
  groupCounts: { group: AudienceGroup; count: number }[]
  manualAdded: number
  /** Sum of every group match before de-duplication. */
  matching: number
  duplicates: number
  excluded: { invalid: number; unsubscribed: number; bounced: number; noConsent: number; manual: number }
  excludedTotal: number
  final: number
}

/** Upgrades campaigns saved with the older `type`/`categories`/`segments` shape. */
export function normalizeAudience(a: NewsletterAudience | null | undefined): AudienceSelection {
  const clean = (list: unknown) => (Array.isArray(list) ? list.map((x) => String(x)).filter(Boolean) : [])
  if (a && Array.isArray(a.groups)) {
    const valid = new Set<string>(AUDIENCE_GROUPS.map((g) => g.value))
    return {
      groups: clean(a.groups).filter((g): g is AudienceGroup => valid.has(g)),
      plans: clean(a.plans),
      include: clean(a.include).map(lower),
      exclude: clean(a.exclude).map(lower),
    }
  }
  const base = { plans: [] as string[], include: [] as string[], exclude: [] as string[] }
  if (!a?.type || a.type === "all") return { ...base, groups: ["all"] }
  if (a.type === "members") return { ...base, groups: ["paid"] }
  if (a.type === "non-members") return { ...base, groups: ["non-members"] }
  const groups: AudienceGroup[] = []
  if (a.categories?.length) groups.push("paid")
  if (a.segments?.length) groups.push("non-members")
  return { ...base, groups, plans: a.categories ?? [] }
}

export function describeAudience(a: NewsletterAudience | null | undefined) {
  return describeSelection(normalizeAudience(a))
}

function isPaymentConfirmed(app: typeof membershipApplications.$inferSelect) {
  if (!app.completed) return false
  if (app.paymentVerifiedAt) return true
  if (app.invitationCode) return true
  return /no payment required/i.test(app.totalAmount ?? "")
}

/**
 * Builds the full contact directory. Payment status comes from stored
 * verification (Stripe webhook / Super Admin crypto check / waiver), never from
 * the applicant's own claim, and approval status comes from the application.
 */
export async function buildDirectory(): Promise<Map<string, Contact>> {
  const now = Date.now()
  const [apps, memberRows, subs, accounts] = await Promise.all([
    db.select().from(membershipApplications).orderBy(desc(membershipApplications.createdAt)),
    db.select().from(members).where(isNull(members.deletedAt)),
    db.select({ email: newsletterSubscribers.email, name: newsletterSubscribers.name }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, "subscribed")),
    db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(and(eq(user.emailVerified, true), ne(user.role, "admin"), ne(user.role, "manager"), ne(user.role, "staff"))),
  ])

  const dir = new Map<string, Contact>()

  // Latest application per person wins (rows are newest first).
  for (const app of apps) {
    const email = lower(app.email)
    if (!email || dir.has(email)) continue
    dir.set(email, {
      email,
      name: app.name,
      isMember: true,
      paid: isPaymentConfirmed(app),
      approval: app.completed ? (app.status as Approval) : "incomplete",
      plan: app.category,
      subscribed: false,
    })
  }

  for (const m of memberRows) {
    const email = lower(m.email)
    if (!email) continue
    const prev = dir.get(email)
    if (isIssuedMembership(m)) {
      const current = m.status === "active" && m.goodStanding && (!m.expiresAt || m.expiresAt.getTime() >= now)
      dir.set(email, { email, name: m.name || prev?.name || "", isMember: true, paid: current, approval: "approved", plan: m.category, subscribed: prev?.subscribed ?? false })
    } else if (!prev) {
      // Profile saved before applying: a registered member who has not paid yet.
      dir.set(email, { email, name: m.name, isMember: true, paid: false, approval: "incomplete", plan: m.category, subscribed: false })
    }
  }

  for (const s of subs) {
    const email = lower(s.email)
    const prev = dir.get(email)
    if (prev) prev.subscribed = true
    else if (email) dir.set(email, { email, name: s.name, isMember: false, paid: false, approval: null, plan: null, subscribed: true })
  }

  for (const a of accounts) {
    const email = lower(a.email)
    if (email && !dir.has(email)) dir.set(email, { email, name: a.name ?? "", isMember: false, paid: false, approval: null, plan: null, subscribed: false })
  }

  return dir
}

function matchesGroup(c: Contact, g: AudienceGroup, plans: string[]) {
  if (g === "non-members") return !c.isMember
  if (g === "all") return c.isMember ? planOk(c, plans) : true
  if (!c.isMember || !planOk(c, plans)) return false
  if (g === "paid") return c.paid
  if (g === "unpaid") return !c.paid && c.approval !== "rejected"
  return c.approval === g
}

const planOk = (c: Contact, plans: string[]) => !plans.length || (c.plan != null && plans.includes(c.plan))

export function statusLabel(c: Contact) {
  if (c.manual) return "Added manually"
  if (!c.isMember) return c.subscribed ? "Non-member · Subscriber" : "Non-member · Registered account"
  const approval =
    c.approval === "approved" ? "Approved" : c.approval === "rejected" ? "Rejected" : c.approval === "pending" ? "Pending review" : "Application incomplete"
  return `${c.paid ? "Paid" : "Unpaid"} · ${approval}`
}

async function suppressionSets(marketing: boolean) {
  const rows = await db
    .select({ email: emailSuppressions.email, topic: emailSuppressions.topic, reason: emailSuppressions.reason })
    .from(emailSuppressions)
    .where(inArray(emailSuppressions.topic, marketing ? [NEWSLETTER_TOPIC, "all"] : ["all"]))
  const bounced = new Set<string>()
  const unsubscribed = new Set<string>()
  for (const r of rows) (/^hard bounce/i.test(r.reason ?? "") ? bounced : unsubscribed).add(lower(r.email))
  return { bounced, unsubscribed }
}

/** Every address the given campaign type must not be sent to right now. */
export async function blockedEmails(marketing: boolean) {
  const { bounced, unsubscribed } = await suppressionSets(marketing)
  return new Set([...bounced, ...unsubscribed])
}

/**
 * Resolves a selection into the final, de-duplicated recipient list plus a
 * breakdown of how it got there. Marketing emails also skip rejected applicants
 * who never opted in, and anyone who unsubscribed from newsletters.
 */
export async function resolveAudience(raw: NewsletterAudience, opts: { marketing: boolean; directory?: Map<string, Contact> }) {
  const audience = normalizeAudience(raw)
  const dir = opts.directory ?? (await buildDirectory())
  const { bounced, unsubscribed } = await suppressionSets(opts.marketing)
  const exclude = new Set(audience.exclude)

  const groupCounts = audience.groups.map((group) => ({ group, count: 0 }))
  const picked = new Map<string, Contact>()
  let matching = 0
  for (const c of dir.values()) {
    let hit = false
    for (const gc of groupCounts) {
      if (matchesGroup(c, gc.group, audience.plans)) {
        gc.count++
        matching++
        hit = true
      }
    }
    if (hit) picked.set(c.email, c)
  }

  let manualAdded = 0
  const invalidManual = audience.include.filter((e) => !EMAIL_RE.test(e)).length
  for (const email of audience.include) {
    if (!EMAIL_RE.test(email)) continue
    manualAdded++
    matching++
    if (!picked.has(email)) picked.set(email, dir.get(email) ?? { email, name: "", isMember: false, paid: false, approval: null, plan: null, subscribed: false, manual: true })
  }

  const excluded = { invalid: invalidManual, unsubscribed: 0, bounced: 0, noConsent: 0, manual: 0 }
  const recipients: ResolvedRecipient[] = []
  for (const c of picked.values()) {
    if (!EMAIL_RE.test(c.email)) excluded.invalid++
    else if (exclude.has(c.email)) excluded.manual++
    else if (bounced.has(c.email)) excluded.bounced++
    else if (unsubscribed.has(c.email)) excluded.unsubscribed++
    else if (opts.marketing && c.approval === "rejected" && !c.subscribed) excluded.noConsent++
    else recipients.push({ ...c, statusLabel: statusLabel(c) })
  }
  recipients.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))

  const excludedTotal = Object.values(excluded).reduce((s, n) => s + n, 0)
  const report: AudienceReport = {
    label: describeSelection(audience),
    groupCounts,
    manualAdded,
    matching: matching + invalidManual,
    duplicates: matching - picked.size,
    excluded,
    excludedTotal,
    final: recipients.length,
  }
  return { audience, recipients, report }
}

/** Contacts matching a name/email search, for building a custom selection. */
export async function searchDirectory(query: string, limit = 20) {
  const q = lower(query)
  if (q.length < 2) return []
  const dir = await buildDirectory()
  const out: ResolvedRecipient[] = []
  for (const c of dir.values()) {
    if (c.email.includes(q) || c.name.toLowerCase().includes(q)) out.push({ ...c, statusLabel: statusLabel(c) })
    if (out.length >= limit) break
  }
  return out
}
