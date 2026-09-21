"use server"

import { db } from "@/lib/db"
import { settings, auditLogs } from "@/lib/db/schema"
import { getSession } from "@/lib/session"
import { sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { MenuItem, SocialLinks, General, Banner, NewsAlert, GovHero, GovFramework, Membership, Footer, CtaBanner, SettingKey } from "@/lib/site-settings"

async function requireStaff() {
  const session = await getSession()
  if (!session?.user) throw new Error("Unauthorized")
  const role = session.user.role
  if (role !== "staff" && role !== "admin") throw new Error("Forbidden")
  return session.user
}

async function put(key: SettingKey, value: unknown, actor: { id: string; name?: string | null }) {
  const serialized = JSON.stringify(value)
  await db
    .insert(settings)
    .values({ key, value: serialized })
    .onConflictDoUpdate({ target: settings.key, set: { value: serialized, updatedAt: new Date() } })
  try {
    await db.insert(auditLogs).values({ actorId: actor.id, actorName: actor.name ?? "", action: "settings.update", target: key })
  } catch {
    // audit failures must never block the write
  }
  // Site chrome and CMS pages depend on settings; revalidate broadly.
  revalidatePath("/", "layout")
}

export async function saveMenu(items: MenuItem[]) {
  const actor = await requireStaff()
  const clean = items
    .map((i) => {
      const children = (Array.isArray(i.children) ? i.children : [])
        .map((c) => {
          const child: MenuItem = { label: String(c.label ?? "").trim(), href: String(c.href ?? "").trim() }
          if (c.newTab) child.newTab = true
          return child
        })
        .filter((c) => c.label && c.href)
      const item: MenuItem = { label: String(i.label ?? "").trim(), href: String(i.href ?? "").trim() }
      if (i.newTab) item.newTab = true
      if (children.length) item.children = children
      return item
    })
    .filter((i) => i.label && i.href)
  await put("menu", clean, actor)
  return { ok: true as const }
}

export async function saveSocial(formData: FormData) {
  const actor = await requireStaff()
  const value: SocialLinks = {
    linkedin: String(formData.get("linkedin") ?? "").trim(),
    x: String(formData.get("x") ?? "").trim(),
    youtube: String(formData.get("youtube") ?? "").trim(),
    instagram: String(formData.get("instagram") ?? "").trim(),
    facebook: String(formData.get("facebook") ?? "").trim(),
  }
  await put("social", value, actor)
  return { ok: true as const }
}

export async function saveGeneral(formData: FormData) {
  const actor = await requireStaff()
  const value: General = {
    siteTitle: String(formData.get("siteTitle") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim(),
    footerText: String(formData.get("footerText") ?? "").trim(),
    copyright: String(formData.get("copyright") ?? "").trim(),
  }
  await put("general", value, actor)
  return { ok: true as const }
}

export async function saveGovHero(formData: FormData) {
  const actor = await requireStaff()
  const overlayRaw = Number(formData.get("overlay"))
  const value: GovHero = {
    eyebrow: String(formData.get("eyebrow") ?? "").trim(),
    headingLine1: String(formData.get("headingLine1") ?? "").trim(),
    headingLine2: String(formData.get("headingLine2") ?? "").trim(),
    headingHighlight: String(formData.get("headingHighlight") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    ctaLabel: String(formData.get("ctaLabel") ?? "").trim(),
    ctaHref: String(formData.get("ctaHref") ?? "").trim(),
    trust1: String(formData.get("trust1") ?? "").trim(),
    trust2: String(formData.get("trust2") ?? "").trim(),
    trust3: String(formData.get("trust3") ?? "").trim(),
    statement: String(formData.get("statement") ?? "").replace(/\r\n/g, "\n").trim(),
    showStatement: formData.get("showStatement") === "on",
    desktopImage: String(formData.get("desktopImage") ?? "").trim(),
    mobileImage: String(formData.get("mobileImage") ?? "").trim(),
    desktopPosition: String(formData.get("desktopPosition") ?? "").trim() || "center",
    mobilePosition: String(formData.get("mobilePosition") ?? "").trim() || "center",
    imageAlt: String(formData.get("imageAlt") ?? "").trim(),
    overlay: Number.isFinite(overlayRaw) ? Math.min(Math.max(overlayRaw, 0), 100) : 100,
  }
  await put("govHero", value, actor)
  return { ok: true as const }
}

export async function saveGovFramework(formData: FormData) {
  const actor = await requireStaff()
  const str = (k: string) => String(formData.get(k) ?? "").trim()
  const value: GovFramework = {
    eyebrow: str("eyebrow"),
    heading: str("heading"),
    description: str("description"),
    govName: str("govName"),
    govDescription: str("govDescription"),
    govLogo: str("govLogo"),
    mofName: str("mofName"),
    mofDescription: str("mofDescription"),
    mofLogo: str("mofLogo"),
  pvaraName: str("pvaraName"),
  pvaraFullName: str("pvaraFullName"),
  pvaraRole: str("pvaraRole"),
  pvaraDescription: str("pvaraDescription"),
  pvaraLogo: str("pvaraLogo"),
  vaapLogo: str("vaapLogo"),
  vaapBadge: str("vaapBadge"),
  vaapEyebrow: str("vaapEyebrow"),
  vaapName: str("vaapName"),
  vaapRole: str("vaapRole"),
  vaapSupporting: str("vaapSupporting"),
  vaapVerified: formData.get("vaapVerified") === "on",
  vaapVerifiedRole: str("vaapVerifiedRole"),
  industryTitle: str("industryTitle"),
  industryDescription: str("industryDescription"),
  industryLogo: str("industryLogo"),
  clarificationLead: str("clarificationLead"),
  clarificationEmphasis: str("clarificationEmphasis"),
  clarificationVerifiedEmphasis: str("clarificationVerifiedEmphasis"),
  }
  await put("govFramework", value, actor)
  return { ok: true as const }
}

export async function saveMembership(formData: FormData) {
  const actor = await requireStaff()
  const value: Membership = {
    eyebrow: String(formData.get("eyebrow") ?? "").trim(),
    heading: String(formData.get("heading") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
  statement: String(formData.get("statement") ?? "").replace(/\r\n/g, "\n").trim(),
  showStatement: formData.get("showStatement") === "on",
  contentFont: (String(formData.get("contentFont") ?? "sans") === "serif" ? "serif" : "sans"),
  contentSize: (() => {
    const v = String(formData.get("contentSize") ?? "base")
    return v === "sm" || v === "lg" ? v : "base"
  })(),
  eligibilityFont: (String(formData.get("eligibilityFont") ?? "sans") === "serif" ? "serif" : "sans"),
  eligibilitySize: (() => {
    const v = String(formData.get("eligibilitySize") ?? "sm")
    return v === "base" || v === "lg" ? v : "sm"
  })(),
  faqEyebrow: String(formData.get("faqEyebrow") ?? "").trim(),
  faqHeading: String(formData.get("faqHeading") ?? "").trim(),
  faqDescription: String(formData.get("faqDescription") ?? "").trim(),
  faqCtaLabel: String(formData.get("faqCtaLabel") ?? "").trim(),
  faqCtaHref: String(formData.get("faqCtaHref") ?? "").trim(),
  }
  await put("membership", value, actor)
  return { ok: true as const }
}

function cleanLinks(raw: unknown): MenuItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((i) => ({
      label: String((i as MenuItem)?.label ?? "").trim(),
      href: String((i as MenuItem)?.href ?? "").trim(),
    }))
    .filter((i) => i.label && i.href)
}

export async function saveFooter(value: Footer) {
  const actor = await requireStaff()
  const clean: Footer = {
    tagline: String(value.tagline ?? "").trim(),
    description: String(value.description ?? "").trim(),
    quickLinksHeading: String(value.quickLinksHeading ?? "").trim(),
    quickLinks: cleanLinks(value.quickLinks),
    resourcesHeading: String(value.resourcesHeading ?? "").trim(),
    resources: cleanLinks(value.resources),
    newsletterHeading: String(value.newsletterHeading ?? "").trim(),
    newsletterText: String(value.newsletterText ?? "").trim(),
    newsletterCta: String(value.newsletterCta ?? "").trim(),
    privacyNote: String(value.privacyNote ?? "").trim(),
    brandTagline: String(value.brandTagline ?? "").trim(),
    legal: cleanLinks(value.legal),
  }
  await put("footer", clean, actor)
  return { ok: true as const }
}

export async function saveCtaBanner(formData: FormData) {
  const actor = await requireStaff()
  const str = (k: string) => String(formData.get(k) ?? "").trim()
  const value: CtaBanner = {
    enabled: formData.get("enabled") === "on",
    eyebrow: str("eyebrow"),
    headingLine1: str("headingLine1"),
    headingHighlight: str("headingHighlight"),
  description: str("description"),
  bannerHref: str("bannerHref") || "/membership",
  primaryLabel: str("primaryLabel"),
    primaryHref: str("primaryHref"),
    secondaryLabel: str("secondaryLabel"),
    secondaryHref: str("secondaryHref"),
    feature1: str("feature1"),
    feature2: str("feature2"),
    feature3: str("feature3"),
    feature4: str("feature4"),
    sideLine: str("sideLine"),
    sideStatement: str("sideStatement"),
    tagline: str("tagline"),
    image: str("image"),
    imageAlt: str("imageAlt"),
  }
  await put("ctaBanner", value, actor)
  return { ok: true as const }
}

export async function saveNewsAlert(formData: FormData) {
  const actor = await requireStaff()
  const value: NewsAlert = {
    enabled: formData.get("enabled") === "on",
    message: String(formData.get("message") ?? "").trim(),
  linkLabel: String(formData.get("linkLabel") ?? "").trim(),
  linkHref: String(formData.get("linkHref") ?? "").trim(),
  dismissible: formData.get("dismissible") === "on",
    color: (["green", "mint", "blue", "sand", "rose", "charcoal", "slate", "violet"].includes(
      String(formData.get("color")),
    )
      ? String(formData.get("color"))
      : "green") as NewsAlert["color"],
  }
  await put("newsAlert", value, actor)
  return { ok: true as const }
}

export async function saveBanner(formData: FormData) {
  const actor = await requireStaff()
  const value: Banner = {
    enabled: formData.get("enabled") === "on",
    title: String(formData.get("title") ?? "").trim(),
    subtitle: String(formData.get("subtitle") ?? "").trim(),
    ctaLabel: String(formData.get("ctaLabel") ?? "").trim(),
    ctaHref: String(formData.get("ctaHref") ?? "").trim(),
  }
  await put("banner", value, actor)
  return { ok: true as const }
}
