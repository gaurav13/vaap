import "server-only"
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { customEmailTemplates, members, membershipApplications, newsletterCampaigns, newsletterRecipients } from "@/lib/db/schema"
import { describeAudience, normalizeAudience } from "@/lib/newsletter/audience"
import { DEFAULT_CTA_COLOR, type CampaignContent, type ContentBlock } from "@/lib/newsletter/content"
import type { Draft } from "@/components/admin/email/shared"

type ContentRow = {
  title: string
  subject: string
  previewText: string
  subheading: string
  bannerUrl: string | null
  bodyHtml: string
  blocks: ContentBlock[] | null
  ctaLabel: string | null
  ctaUrl: string | null
  ctaColor: string | null
  footerHtml: string
}

function toContent(r: ContentRow): CampaignContent {
  return {
    title: r.title,
    subject: r.subject,
    previewText: r.previewText,
    subheading: r.subheading,
    bannerUrl: r.bannerUrl ?? "",
    bodyHtml: r.bodyHtml,
    blocks: Array.isArray(r.blocks) ? r.blocks : [],
    ctaLabel: r.ctaLabel ?? "",
    ctaUrl: r.ctaUrl ?? "",
    ctaColor: r.ctaColor || DEFAULT_CTA_COLOR,
    footerHtml: r.footerHtml,
  }
}

export type EditableRow = Draft & { audienceLabel: string; updatedAt: string; updatedByName: string }

export async function loadEditable(kind: "newsletter" | "custom"): Promise<EditableRow[]> {
  const rows = await db
    .select()
    .from(newsletterCampaigns)
    .where(and(eq(newsletterCampaigns.kind, kind), inArray(newsletterCampaigns.status, ["draft", "scheduled"])))
    .orderBy(desc(newsletterCampaigns.updatedAt))
    .limit(100)
  return rows.map((c) => ({
    id: c.id,
    status: c.status,
    name: "",
    content: toContent(c),
    audience: normalizeAudience(c.audience),
    isMarketing: c.isMarketing,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    audienceLabel: describeAudience(c.audience),
    updatedAt: c.updatedAt.toISOString(),
    updatedByName: c.updatedByName,
  }))
}

export type TemplateRow = Draft & { audienceLabel: string; updatedAt: string; updatedByName: string }

export async function loadTemplates(): Promise<TemplateRow[]> {
  const rows = await db.select().from(customEmailTemplates).where(isNull(customEmailTemplates.deletedAt)).orderBy(desc(customEmailTemplates.updatedAt))
  return rows.map((t) => ({
    id: t.id,
    status: "template",
    name: t.name,
    content: toContent(t),
    audience: normalizeAudience(t.audience),
    isMarketing: t.isMarketing,
    scheduledAt: null,
    audienceLabel: describeAudience(t.audience),
    updatedAt: t.updatedAt.toISOString(),
    updatedByName: t.updatedByName,
  }))
}

export type HistoryRow = {
  id: number
  kind: string
  title: string
  subject: string
  isMarketing: boolean
  audienceLabel: string
  status: string
  sentAt: string | null
  sentByName: string
  total: number
  queued: number
  sent: number
  failed: number
  bounced: number
  opened: number
  unsubscribed: number
}

export async function loadHistory(): Promise<HistoryRow[]> {
  const rows = await db
    .select()
    .from(newsletterCampaigns)
    .where(inArray(newsletterCampaigns.status, ["sending", "sent", "cancelled"]))
    .orderBy(desc(sql`coalesce(${newsletterCampaigns.startedAt}, ${newsletterCampaigns.updatedAt})`))
    .limit(200)
  if (!rows.length) return []

  const counts = await db
    .select({
      campaignId: newsletterRecipients.campaignId,
      total: sql<number>`count(*)::int`,
      queued: sql<number>`count(*) filter (where ${newsletterRecipients.status} = 'queued')::int`,
      sent: sql<number>`count(*) filter (where ${newsletterRecipients.status} = 'sent')::int`,
      failed: sql<number>`count(*) filter (where ${newsletterRecipients.status} = 'failed')::int`,
      bounced: sql<number>`count(*) filter (where ${newsletterRecipients.status} = 'bounced')::int`,
      opened: sql<number>`count(*) filter (where ${newsletterRecipients.openedAt} is not null)::int`,
      unsubscribed: sql<number>`count(*) filter (where ${newsletterRecipients.unsubscribedAt} is not null)::int`,
    })
    .from(newsletterRecipients)
    .where(inArray(newsletterRecipients.campaignId, rows.map((r) => r.id)))
    .groupBy(newsletterRecipients.campaignId)
  const byId = new Map(counts.map((c) => [c.campaignId, c]))

  return rows.map((c) => {
    const n = byId.get(c.id)
    return {
      id: c.id,
      kind: c.kind,
      title: c.title,
      subject: c.subject || c.title,
      isMarketing: c.isMarketing,
      audienceLabel: describeAudience(c.audience),
      status: c.status,
      sentAt: (c.startedAt ?? c.completedAt)?.toISOString() ?? null,
      sentByName: c.sentByName || c.updatedByName,
      total: n?.total ?? c.totalRecipients,
      queued: n?.queued ?? 0,
      sent: n?.sent ?? 0,
      failed: n?.failed ?? 0,
      bounced: n?.bounced ?? 0,
      opened: n?.opened ?? 0,
      unsubscribed: n?.unsubscribed ?? 0,
    }
  })
}

/** Membership plan names used by the audience plan filter. */
export async function loadPlans(): Promise<string[]> {
  const [a, b] = await Promise.all([
    db.selectDistinct({ v: members.category }).from(members).where(isNotNull(members.category)),
    db.selectDistinct({ v: membershipApplications.category }).from(membershipApplications).where(isNotNull(membershipApplications.category)),
  ])
  return [...new Set([...a, ...b].map((r) => r.v?.trim()).filter((v): v is string => Boolean(v)))].sort()
}
