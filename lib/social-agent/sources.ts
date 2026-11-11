import "server-only"
import { and, desc, eq, gt, isNull, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import { articles, events, kolProfiles, leadership, members, news, partners } from "@/lib/db/schema"
import { PUBLIC_SITE_URL } from "@/lib/site-url"
import type { CategoryKey } from "@/lib/social-agent/config"

export type SourceRecord = {
  sourceId: string
  title: string
  url: string
  approvedAt: Date
  fields: Record<string, string>
}

const ADVISORY = "Advisory Committee Members"
const SITE = PUBLIC_SITE_URL.replace(/^https?:\/\//, "")
const LIMIT = 50

const fmtDate = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" }) : ""
const fmtNum = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n))
const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${PUBLIC_SITE_URL}${path}`)
const plain = (s: string | null | undefined, max = 400) =>
  (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max)

/**
 * Approved website records for a category. `since` limits results to records approved after that time,
 * `id` fetches a single record. Only published / approved / verified data is ever returned.
 */
export async function getSourceRecords(
  category: CategoryKey,
  opts: { since?: Date | null; id?: string } = {},
): Promise<SourceRecord[]> {
  const numericId = opts.id !== undefined ? Number(opts.id) : undefined
  if (opts.id !== undefined && !Number.isInteger(numericId)) return []

  switch (category) {
    case "team":
    case "advisory": {
      const rows = await db
        .select()
        .from(leadership)
        .where(
          and(
            eq(leadership.published, true),
            category === "advisory" ? eq(leadership.kind, ADVISORY) : ne(leadership.kind, ADVISORY),
            numericId !== undefined ? eq(leadership.id, numericId) : undefined,
            opts.since ? gt(leadership.createdAt, opts.since) : undefined,
          ),
        )
        .orderBy(desc(leadership.createdAt))
        .limit(LIMIT)
      return rows.map((r) => ({
        sourceId: String(r.id),
        title: r.name,
        url: abs(`/team/${r.id}`),
        approvedAt: r.createdAt,
        fields: {
          photo: r.photo ?? "",
          name: r.name,
          position: category === "advisory" ? "Advisory Board Member" : r.kind,
          title: r.position,
          organization: r.organization,
          website: SITE,
        },
      }))
    }
    case "kol": {
      const rows = await db
        .select()
        .from(kolProfiles)
        .where(
          and(
            eq(kolProfiles.status, "verified"),
            numericId !== undefined ? eq(kolProfiles.id, numericId) : undefined,
            opts.since ? gt(kolProfiles.verifiedAt, opts.since) : undefined,
          ),
        )
        .orderBy(desc(kolProfiles.verifiedAt))
        .limit(LIMIT)
      return rows.map((r) => {
        const verified = r.platforms.filter((p) => p.ownershipVerified)
        const followers = verified.reduce((s, p) => s + (p.followers || 0), 0)
        const stats = [
          followers ? `${fmtNum(followers)} verified followers` : "",
          r.monthlyReach && r.metricsVerified ? `${fmtNum(r.monthlyReach)} monthly reach` : "",
        ].filter(Boolean)
        return {
          sourceId: String(r.id),
          title: r.professionalName || r.fullName,
          url: abs(`/membership/verified-opinion-leaders/${r.slug}`),
          approvedAt: r.verifiedAt ?? r.updatedAt,
          fields: {
            photo: r.photo,
            name: r.professionalName || r.fullName,
            designation: [r.title, r.organization].filter(Boolean).join(", "),
            handles: verified.map((p) => p.platform).join(" · "),
            stats: stats.join(" · "),
            website: SITE,
          },
        }
      })
    }
    case "partners": {
      const rows = await db
        .select()
        .from(partners)
        .where(
          and(
            eq(partners.published, true),
            numericId !== undefined ? eq(partners.id, numericId) : undefined,
            opts.since ? gt(partners.createdAt, opts.since) : undefined,
          ),
        )
        .orderBy(desc(partners.createdAt))
        .limit(LIMIT)
      return rows.map((r) => ({
        sourceId: String(r.id),
        title: r.name,
        url: r.url || abs("/"),
        approvedAt: r.createdAt,
        fields: { logo: r.logo ?? "", name: r.name, headline: `Welcome ${r.name} to the VAAP partner network`, website: SITE },
      }))
    }
    case "news": {
      const rows = await db
        .select()
        .from(news)
        .where(
          and(
            eq(news.published, true),
            numericId !== undefined ? eq(news.id, numericId) : undefined,
            opts.since ? gt(news.createdAt, opts.since) : undefined,
          ),
        )
        .orderBy(desc(news.createdAt))
        .limit(LIMIT)
      return rows.map((r) => ({
        sourceId: String(r.id),
        title: r.title,
        url: r.externalUrl || abs(`/news/${r.id}`),
        approvedAt: r.createdAt,
        fields: {
          // Only the publisher logo stored on this exact news record is used — never a substitute.
          publisherLogo: r.publisherLogo ?? "",
          image: r.image ?? "",
          headline: r.title,
          summary: plain(r.excerpt, 300),
          date: fmtDate(r.originalPublishedAt ?? r.createdAt),
          publisher: r.publisherName || "VAAP",
          website: SITE,
        },
      }))
    }
    case "articles": {
      const rows = await db
        .select()
        .from(articles)
        .where(
          and(
            eq(articles.status, "published"),
            numericId !== undefined ? eq(articles.id, numericId) : undefined,
            opts.since ? gt(articles.publishedAt, opts.since) : undefined,
          ),
        )
        .orderBy(desc(articles.publishedAt))
        .limit(LIMIT)
      return rows.map((r) => ({
        sourceId: String(r.id),
        title: r.title,
        url: abs(`/insights/${r.slug}`),
        approvedAt: r.publishedAt ?? r.updatedAt,
        fields: {
          image: r.image ?? "",
          headline: r.title,
          summary: plain(r.excerpt || r.content, 300),
          author: [r.authorName, r.authorRole].filter(Boolean).join(", "),
          date: fmtDate(r.publishedAt),
          website: SITE,
        },
      }))
    }
    case "events": {
      const rows = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.published, true),
            eq(events.status, "approved"),
            numericId !== undefined ? eq(events.id, numericId) : undefined,
            opts.since ? gt(events.createdAt, opts.since) : undefined,
          ),
        )
        .orderBy(desc(events.createdAt))
        .limit(LIMIT)
      return rows.map((r) => ({
        sourceId: String(r.id),
        title: r.title,
        url: abs(`/events/${r.slug || r.id}`),
        approvedAt: r.createdAt,
        fields: {
          image: r.coverImage ?? "",
          headline: r.title,
          date: [fmtDate(r.startsAt), r.timeLabel].filter(Boolean).join(" · "),
          location: r.location || r.city,
          host: r.hostName || "VAAP",
          website: SITE,
        },
      }))
    }
    case "membership": {
      const rows = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.status, "active"),
            isNull(members.deletedAt),
            numericId !== undefined ? eq(members.id, numericId) : undefined,
            opts.since ? gt(members.joinedAt, opts.since) : undefined,
          ),
        )
        .orderBy(desc(members.joinedAt))
        .limit(LIMIT)
      // Contact details (email, phone, NTN, membership ID) are never copied into posts.
      return rows.map((r) => ({
        sourceId: String(r.id),
        title: r.name,
        url: abs("/membership"),
        approvedAt: r.joinedAt,
        fields: {
          name: r.name,
          designation: r.designation ?? "",
          organization: r.organization ?? "",
          memberCategory: r.category,
          website: SITE,
        },
      }))
    }
  }
}

export async function getSourceRecord(category: CategoryKey, id: string) {
  const [record] = await getSourceRecords(category, { id })
  return record ?? null
}
