import { pgTable, text, timestamp, boolean, serial, integer, jsonb, uniqueIndex, primaryKey } from "drizzle-orm/pg-core"
import type { EmailContent } from "@/lib/email-templates/registry"

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Optional SEO overrides keyed by "<kind>:<id>"; empty fields fall back to the content itself.
export const seoEntries = pgTable("seo_entries", {
  key: text("key").primaryKey(),
  seoTitle: text("seoTitle").notNull().default(""),
  metaDescription: text("metaDescription").notNull().default(""),
  keywords: text("keywords").notNull().default(""),
  canonicalUrl: text("canonicalUrl").notNull().default(""),
  noindex: boolean("noindex").notNull().default(false),
  ogTitle: text("ogTitle").notNull().default(""),
  ogDescription: text("ogDescription").notNull().default(""),
  ogImage: text("ogImage").notNull().default(""),
  twitterTitle: text("twitterTitle").notNull().default(""),
  twitterDescription: text("twitterDescription").notNull().default(""),
  twitterImage: text("twitterImage").notNull().default(""),
  customSchema: text("customSchema").notNull().default(""),
  extra: jsonb("extra").$type<Record<string, string>>().notNull().default({}),
  published: boolean("published").notNull().default(true),
  updatedBy: text("updatedBy"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  // Role-based access: "member" (default), "staff", or "admin" (super admin).
  role: text("role").notNull().default("member"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// --- App tables ------------------------------------------------------------

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("Industry Update"),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull().default(""),
  image: text("image"),
  // Media coverage: the outlet that published the story and the link to it.
  publisherName: text("publisherName").notNull().default(""),
  publisherLogo: text("publisherLogo"),
  externalUrl: text("externalUrl"),
  sourceType: text("sourceType").notNull().default("original"),
  originalPublishedAt: timestamp("originalPublishedAt"),
  // Optional link to a committee — when set, the post also surfaces in the
  // "Committee News / Latest Updates" section of the Committees page.
  committeeId: integer("committeeId"),
  published: boolean("published").notNull().default(true),
  authorId: text("authorId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  // SEO-friendly URL segment, e.g. /events/web3-summit-karachi-2026.
  slug: text("slug").unique(),
  description: text("description").notNull().default(""),
  location: text("location").notNull().default(""),
  timeLabel: text("timeLabel").notNull().default(""),
  startsAt: timestamp("startsAt").notNull().defaultNow(),
  published: boolean("published").notNull().default(true),
  // Public-facing host / organizer name (e.g. a member's org or "VAAP").
  hostName: text("hostName").notNull().default(""),
  coverImage: text("coverImage"),
  category: text("category").notNull().default(""),
  city: text("city").notNull().default(""),
  format: text("format").notNull().default(""),
  // Set when a member submits the event; null for admin-created events.
  submittedByUserId: text("submittedByUserId"),
  submittedByName: text("submittedByName").notNull().default(""),
  // "approved" | "pending" | "rejected". Member submissions start "pending".
  status: text("status").notNull().default("approved"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Event RSVPs (Luma-style participant list) -----------------------------

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    id: serial("id").primaryKey(),
    eventId: integer("eventId").notNull(),
    // Set when a signed-in user RSVPs; null for guest RSVPs.
    userId: text("userId"),
    name: text("name").notNull(),
    // Always stored lowercased so the (eventId, email) unique index blocks duplicates.
    email: text("email").notNull(),
    organization: text("organization").notNull().default(""),
    // "pending" (awaiting email verification) | "confirmed" | "cancelled".
    // Defaults to "confirmed" so registrations recorded before verification existed stay counted.
    status: text("status").notNull().default("confirmed"),
    verifiedAt: timestamp("verifiedAt"),
    // SHA-256 of the single-use verification token; cleared once used.
    verifyTokenHash: text("verifyTokenHash"),
    verifyExpiresAt: timestamp("verifyExpiresAt"),
    verifyLastSentAt: timestamp("verifyLastSentAt"),
    verifySendCount: integer("verifySendCount").notNull().default(0),
    verifyWindowStartedAt: timestamp("verifyWindowStartedAt"),
    cancelledAt: timestamp("cancelledAt"),
    // Set by staff at the door; null until the participant is checked in.
    checkedInAt: timestamp("checkedInAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("event_rsvps_event_email_unique").on(t.eventId, t.email)],
)

export const membershipApplications = pgTable("membership_applications", {
  id: serial("id").primaryKey(),
  // Human-readable application reference, e.g. VAAP-2026-000123.
  reference: text("reference"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  organization: text("organization"),
  category: text("category").notNull().default("Corporate Members"),
  message: text("message").notNull().default(""),
  // Rich application detail captured by the multi-step apply wizard.
  registrationNumber: text("registrationNumber"),
  website: text("website"),
  industrySector: text("industrySector"),
  designation: text("designation"),
  phone: text("phone"),
  cnic: text("cnic"),
  paymentMethod: text("paymentMethod"), // "card" | "crypto"
  // Crypto transaction hash / TXID captured when paying with cryptocurrency.
  txid: text("txid"),
  // Coin the applicant chose (e.g. BTC) and the VAAP wallet address they were shown.
  cryptoCoin: text("cryptoCoin"),
  cryptoAddress: text("cryptoAddress"),
  admissionFee: text("admissionFee"),
  annualFee: text("annualFee"),
  totalAmount: text("totalAmount"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  // false = applicant saved their details but abandoned before final submit
  // (e.g. stopped at the payment stage). true = full application submitted.
  completed: boolean("completed").notNull().default(false),
  // Invitation code redeemed for invite-only categories (Academic & Research).
  invitationCode: text("invitationCode"),
  // Set by a Super Admin after checking a manual (crypto) payment on-chain.
  paymentVerifiedAt: timestamp("paymentVerifiedAt"),
  paymentVerifiedBy: text("paymentVerifiedBy"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Admin-issued codes that unlock invite-only membership categories.
export const membershipInvitationCodes = pgTable("membership_invitation_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  label: text("label").notNull().default(""),
  // null = unlimited uses
  maxUses: integer("maxUses"),
  usedCount: integer("usedCount").notNull().default(0),
  expiresAt: timestamp("expiresAt"),
  active: boolean("active").notNull().default(true),
  createdBy: text("createdBy"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Invitations and reminders sent to registered users who have not activated a
// paid membership. One row per send attempt.
export const membershipInvitations = pgTable("membership_invitations", {
  id: serial("id").primaryKey(),
  userId: text("userId"),
  email: text("email").notNull(),
  stage: text("stage").notNull(), // invitation | reminder-1 | reminder-2 | reminder-final | manual-reminder
  trigger: text("trigger").notNull(), // manual | bulk | automation
  status: text("status").notNull(), // sent | failed | skipped
  error: text("error"),
  actor: text("actor"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  organization: text("organization"),
  phone: text("phone"),
  country: text("country"),
  inquiryType: text("inquiryType").notNull().default("General Inquiry"),
  subject: text("subject").notNull().default(""),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  // pending | in_progress | resolved. `handled` mirrors status === "resolved".
  status: text("status").notNull().default("pending"),
  assignedToId: text("assignedToId"),
  assignedToName: text("assignedToName").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const contactMessageReplies = pgTable("contact_message_replies", {
  id: serial("id").primaryKey(),
  messageId: integer("messageId").notNull(),
  body: text("body").notNull(),
  sentById: text("sentById"),
  sentByName: text("sentByName"),
  emailStatus: text("emailStatus").notNull().default("sent"), // sent | failed | skipped
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Support & Grievance Centre complaints submitted from the public /support page.
// Each row carries a public case reference (VAAP-CASE-000123) that anyone can
// use to track status without signing in. Status moves through the lifecycle
// shown in the "How Your Case Is Handled" stepper.
export const complaints = pgTable("complaints", {
  id: serial("id").primaryKey(),
  reference: text("reference").unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  category: text("category").notNull().default("Complaint Assistance"),
  description: text("description").notNull(),
  // submitted | review | guidance | closed
  status: text("status").notNull().default("submitted"),
  // Optional note the team surfaces to the complainant when tracking a case.
  statusNote: text("statusNote"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// --- CMS: dynamic pages (parent / child hierarchy) -------------------------

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  // Top-level section this page belongs to, e.g. "community" or "industry".
  // Null for a standalone top-level page.
  parentSlug: text("parentSlug"),
  heroTitle: text("heroTitle").notNull().default(""),
  heroSubtitle: text("heroSubtitle").notNull().default(""),
  heroImage: text("heroImage"),
  content: text("content").notNull().default(""),
  seoTitle: text("seoTitle").notNull().default(""),
  metaDescription: text("metaDescription").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft | published
  sortOrder: serial("sortOrder"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// --- Publications / knowledge ----------------------------------------------

export const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  author: text("author").notNull().default(""),
  category: text("category").notNull().default("Research"),
  coverImage: text("coverImage"),
  pdfUrl: text("pdfUrl"),
  membersOnly: boolean("membersOnly").notNull().default(false),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Governance / official documents ---------------------------------------

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("Governance Policies"),
  description: text("description").notNull().default(""),
  fileUrl: text("fileUrl"),
  published: boolean("published").notNull().default(true),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Leadership / executive committee profiles -----------------------------

export const leadership = pgTable("leadership", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull().default(""),
  organization: text("organization").notNull().default(""),
  bio: text("bio").notNull().default(""),
  photo: text("photo"),
  linkedin: text("linkedin"),
  x: text("x"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  website: text("website"),
  email: text("email"),
  responsibility: text("responsibility").notNull().default(""),
  // "message" profiles render on About; "committee" on Governance.
  kind: text("kind").notNull().default("committee"),
  featured: boolean("featured").notNull().default(false),
  sortOrder: serial("sortOrder"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Sub-committees ---------------------------------------------------------

export const committees = pgTable("committees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  // Committee head (the person shown on each committee card).
  headName: text("headName").notNull().default(""),
  headTitle: text("headTitle").notNull().default("Committee Head"),
  headPhoto: text("headPhoto"),
  headLinkedin: text("headLinkedin"),
  headX: text("headX"),
  headFacebook: text("headFacebook"),
  headInstagram: text("headInstagram"),
  headWebsite: text("headWebsite"),
  headEmail: text("headEmail"),
  sortOrder: serial("sortOrder"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Partners ---------------------------------------------------------------

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  url: text("url"),
  sortOrder: serial("sortOrder"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Media & social highlights (home page) ---------------------------------

export const mediaHighlights = pgTable("media_highlights", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  kind: text("kind").notNull().default("Video"),
  image: text("image"),
  url: text("url"),
  duration: text("duration").notNull().default(""),
  featured: boolean("featured").notNull().default(false),
  sortOrder: serial("sortOrder"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Official status blocks (CMS-controlled credibility content) -----------

export const officialStatus = pgTable("official_status", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  documentUrl: text("documentUrl"),
  documentLabel: text("documentLabel").notNull().default("View official document"),
  sortOrder: serial("sortOrder"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Member records (verification + voting eligibility) --------------------

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: text("userId").references(() => user.id, { onDelete: "set null" }),
  membershipId: text("membershipId").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  organization: text("organization"),
  ntn: text("ntn"),
  designation: text("designation"),
  phone: text("phone"),
  linkedin: text("linkedin"),
  website: text("website"),
  city: text("city"),
  bio: text("bio"),
  // One-line (max 80 chars) bio shown in the "Written by" box on articles.
  authorBio: text("authorBio"),
  // "ntn" | "blockchain" | "virtual-asset" | "other" — used to gate voting registration.
  assetType: text("assetType"),
  category: text("category").notNull().default("Verified Community Members"),
  status: text("status").notNull().default("active"), // active | suspended | expired
  votingEligible: boolean("votingEligible").notNull().default(false),
  voteRequested: boolean("voteRequested").notNull().default(false),
  goodStanding: boolean("goodStanding").notNull().default(true),
  joinedAt: timestamp("joinedAt").notNull().defaultNow(),
  expiresAt: timestamp("expiresAt"),
  // Soft delete: non-null means the record is in the admin "trash" folder.
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Membership plans (categories, pricing, benefits, eligibility) ---------

export const membershipPlans = pgTable("membership_plans", {
  id: serial("id").primaryKey(),
  // Lucide icon name, e.g. "Building2". Rendered via a name→icon map.
  icon: text("icon").notNull().default("Building2"),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  description: text("description").notNull().default(""),
  annualFee: text("annualFee").notNull().default(""),
  annualFeeNote: text("annualFeeNote").notNull().default(""),
  admissionFee: text("admissionFee").notNull().default(""),
  admissionFeeNote: text("admissionFeeNote").notNull().default(""),
  term: text("term").notNull().default("1 Year"),
  // Newline-separated list — one benefit per line.
  benefits: text("benefits").notNull().default(""),
  // Newline-separated list — one eligibility criterion per line.
  eligibility: text("eligibility").notNull().default(""),
  sortOrder: serial("sortOrder"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Membership FAQs (question / answer accordion) -------------------------

export const membershipFaqs = pgTable("membership_faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull().default(""),
  sortOrder: serial("sortOrder"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Audit logs -------------------------------------------------------------

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: text("actorId"),
  actorName: text("actorName").notNull().default(""),
  action: text("action").notNull(),
  target: text("target").notNull().default(""),
  actorRole: text("actorRole").notNull().default(""),
  entityType: text("entityType").notNull().default(""),
  entityId: text("entityId").notNull().default(""),
  details: text("details").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Point-in-time snapshot taken before every staff/admin content edit so any
// change can be reviewed and restored by a Super Admin.
export const contentRevisions = pgTable("content_revisions", {
  id: serial("id").primaryKey(),
  entityType: text("entityType").notNull(),
  entityId: text("entityId").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  action: text("action").notNull().default("update"),
  actorId: text("actorId"),
  actorName: text("actorName").notNull().default(""),
  actorRole: text("actorRole").notNull().default(""),
  restoredAt: timestamp("restoredAt"),
  restoredBy: text("restoredBy"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Staff cannot edit the homepage directly; they file a change request that a
// Super Admin approves (and applies) or rejects.
export const contentChangeRequests = pgTable("content_change_requests", {
  id: serial("id").primaryKey(),
  section: text("section").notNull(),
  title: text("title").notNull(),
  details: text("details").notNull().default(""),
  proposedText: text("proposedText").notNull().default(""),
  proposedImage: text("proposedImage"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  submittedById: text("submittedById"),
  submittedByName: text("submittedByName").notNull().default(""),
  reviewedById: text("reviewedById"),
  reviewedByName: text("reviewedByName").notNull().default(""),
  reviewNote: text("reviewNote").notNull().default(""),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// ===========================================================================
// Staff, Committee, Referral & Rewards system
// ===========================================================================

// --- Staff / committee profiles --------------------------------------------
// Extends a Better Auth user with role-specific profile data. A committee head
// is a staff_profile with isCommitteeHead = true and a committeeId set.

export const staffProfiles = pgTable("staff_profiles", {
  id: serial("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  position: text("position").notNull().default(""),
  committeeId: integer("committeeId"),
  committeeIds: integer("committeeIds").array().notNull().default([]),
  isCommitteeHead: boolean("isCommitteeHead").notNull().default(false),
  bio: text("bio").notNull().default(""),
  photo: text("photo"),
  phone: text("phone"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Articles (staff / committee authored content) -------------------------
// Workflow: draft -> in_review -> approved -> published, plus changes_requested
// / rejected / archived. Staff & committee heads can author + submit but only
// admin (super admin) can approve & publish.

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  category: text("category").notNull().default("Insight"),
  image: text("image"),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull().default(""),
  tags: text("tags").notNull().default(""),
  authorId: text("authorId"),
  authorName: text("authorName").notNull().default(""),
  authorRole: text("authorRole").notNull().default(""),
  committeeId: integer("committeeId"),
  seoTitle: text("seoTitle").notNull().default(""),
  seoDescription: text("seoDescription").notNull().default(""),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const articleApprovals = pgTable("article_approvals", {
  id: serial("id").primaryKey(),
  articleId: integer("articleId").notNull(),
  reviewerId: text("reviewerId"),
  reviewerName: text("reviewerName").notNull().default(""),
  decision: text("decision").notNull(), // submitted | approved | published | changes_requested | rejected | archived
  note: text("note").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Referral campaigns -----------------------------------------------------

export const referralCampaigns = pgTable("referral_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  eligibleCategories: text("eligibleCategories").notNull().default(""), // comma list, empty = all
  eligibleRoles: text("eligibleRoles").notNull().default(""), // comma list, empty = all
  maxReferrals: integer("maxReferrals"),
  maxReward: integer("maxReward"),
  status: text("status").notNull().default("draft"), // draft | active | paused | completed | archived
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Referral partners (KOLs / influencers / external partners) ------------

export const referralPartners = pgTable("referral_partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("KOL"), // KOL | Influencer | Community Partner | Media Partner | Campaign Partner
  email: text("email").notNull(),
  // Optional linked auth user, so a partner can sign into the lightweight portal.
  userId: text("userId"),
  campaignId: integer("campaignId"),
  status: text("status").notNull().default("active"), // active | paused | archived
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Referral codes ---------------------------------------------------------
// Owned either by an internal user (ownerUserId) or an external partner
// (partnerId). Exactly one is expected to be set.

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull().default(""),
  ownerUserId: text("ownerUserId"),
  partnerId: integer("partnerId"),
  campaignId: integer("campaignId"),
  eligibleCategories: text("eligibleCategories").notNull().default(""), // comma list, empty = all
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expiresAt"),
  maxUses: integer("maxUses"),
  uses: integer("uses").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Referral clicks (lightweight traffic tracking) ------------------------

export const referralClicks = pgTable("referral_clicks", {
  id: serial("id").primaryKey(),
  codeId: integer("codeId"),
  code: text("code").notNull(),
  referer: text("referer").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Referral attributions --------------------------------------------------
// The immutable link between a referrer and a referred prospect/application.
// Once a membership is approved this drives reward eligibility. Attribution is
// locked after creation; exceptional changes are done by admin with an audit
// log entry rather than silent edits.

export const referralAttributions = pgTable("referral_attributions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  codeId: integer("codeId"),
  referrerUserId: text("referrerUserId"),
  partnerId: integer("partnerId"),
  campaignId: integer("campaignId"),
  applicationId: integer("applicationId"),
  memberEmail: text("memberEmail").notNull().default(""),
  membershipId: text("membershipId"),
  // invited | application_started | application_submitted | payment_pending |
  // under_review | approved | rejected | reward_eligible | reward_approved | paid | cancelled
  status: text("status").notNull().default("application_submitted"),
  locked: boolean("locked").notNull().default(true),
  note: text("note").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// --- Commission rules -------------------------------------------------------

export const commissionRules = pgTable("commission_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  referrerRole: text("referrerRole").notNull().default(""), // empty = any
  membershipCategory: text("membershipCategory").notNull().default(""), // empty = any
  campaignId: integer("campaignId"),
  rewardType: text("rewardType").notNull().default("percentage"), // percentage | fixed | none
  commissionPercent: text("commissionPercent").notNull().default("0"), // percent, e.g. "10" or "7.5"
  fixedAmount: integer("fixedAmount").notNull().default(0),
  currency: text("currency").notNull().default("PKR"),
  // Which fees are commissionable — comma list of: admission,annual,renewal
  commissionableFees: text("commissionableFees").notNull().default("annual"),
  minPayment: integer("minPayment").notNull().default(0),
  rewardTrigger: text("rewardTrigger").notNull().default("membership_approved"),
  effectiveFrom: timestamp("effectiveFrom"),
  effectiveUntil: timestamp("effectiveUntil"),
  status: text("status").notNull().default("draft"), // draft | active | paused | archived
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// --- Reward transactions ----------------------------------------------------
// Created only when a referred membership is approved & active. Stores a
// snapshot of the commission rule so later rule edits never rewrite history.

export const rewardTransactions = pgTable("reward_transactions", {
  id: serial("id").primaryKey(),
  attributionId: integer("attributionId"),
  referrerUserId: text("referrerUserId"),
  partnerId: integer("partnerId"),
  referrerName: text("referrerName").notNull().default(""),
  referrerRole: text("referrerRole").notNull().default(""),
  memberEmail: text("memberEmail").notNull().default(""),
  memberName: text("memberName").notNull().default(""),
  membershipId: text("membershipId"),
  membershipCategory: text("membershipCategory").notNull().default(""),
  eligibleAmount: integer("eligibleAmount").notNull().default(0),
  commissionRate: text("commissionRate").notNull().default(""),
  rewardAmount: integer("rewardAmount").notNull().default(0),
  currency: text("currency").notNull().default("PKR"),
  ruleId: integer("ruleId"),
  ruleSnapshot: text("ruleSnapshot").notNull().default(""),
  // pending_eligibility | eligible | under_review | approved |
  // payment_processing | paid | cancelled | reversed
  status: text("status").notNull().default("eligible"),
  note: text("note").notNull().default(""),
  approvedById: text("approvedById"),
  approvedByName: text("approvedByName").notNull().default(""),
  approvedAt: timestamp("approvedAt"),
  batchId: integer("batchId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const rewardAdjustments = pgTable("reward_adjustments", {
  id: serial("id").primaryKey(),
  rewardId: integer("rewardId").notNull(),
  amount: integer("amount").notNull().default(0), // signed; negative reduces payout
  reason: text("reason").notNull().default(""),
  adminId: text("adminId"),
  adminName: text("adminName").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Reward payment batches -------------------------------------------------

export const paymentBatches = pgTable("payment_batches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  period: text("period").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | approved | processing | paid | cancelled
  createdById: text("createdById"),
  createdByName: text("createdByName").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const rewardPayments = pgTable("reward_payments", {
  id: serial("id").primaryKey(),
  batchId: integer("batchId"),
  rewardId: integer("rewardId"),
  recipientUserId: text("recipientUserId"),
  partnerId: integer("partnerId"),
  recipientName: text("recipientName").notNull().default(""),
  role: text("role").notNull().default(""),
  gross: integer("gross").notNull().default(0),
  adjustments: integer("adjustments").notNull().default(0),
  finalAmount: integer("finalAmount").notNull().default(0),
  currency: text("currency").notNull().default("PKR"),
  method: text("method").notNull().default(""),
  reference: text("reference").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | approved | processing | paid | failed | cancelled
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Notifications ----------------------------------------------------------

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("userId"), // null + role set = broadcast to a role
  role: text("role"),
  type: text("type").notNull().default("info"),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  link: text("link").notNull().default(""),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  })

// Per-user read receipts for broadcast (role / community) notifications.
export const notificationReads = pgTable(
  "notification_reads",
  {
    notificationId: integer("notificationId").notNull(),
    userId: text("userId").notNull(),
    readAt: timestamp("readAt").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.notificationId, t.userId] })],
)
  
// ===========================================================================
// Governance, Elections & XRPL verification system (see 005-governance-schema.sql)
// ===========================================================================

// Stable public-facing governance ID per member for the public voting register.
export const governancePublicIds = pgTable("governance_public_ids", {
  id: serial("id").primaryKey(),
  memberId: integer("memberId").notNull(),
  publicId: text("publicId").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Per-member governance capabilities layered on top of role-based access.
export const governanceMemberPermissions = pgTable("governance_member_permissions", {
  id: serial("id").primaryKey(),
  memberId: integer("memberId").notNull(),
  canPropose: boolean("canPropose").notNull().default(false),
  canVote: boolean("canVote").notNull().default(true),
  isElectionOfficer: boolean("isElectionOfficer").notNull().default(false),
  note: text("note").notNull().default(""),
  // Formal VAAP election voting right (Chair, Vice Chair, Exec Committee, ...).
  // pending | approved | rejected | suspended | revoked
  electionStatus: text("electionStatus").notNull().default("pending"),
  electionApprovedBy: text("electionApprovedBy").notNull().default(""),
  electionApprovedAt: timestamp("electionApprovedAt"),
  electionReason: text("electionReason").notNull().default(""),
  // Governance / project / DAO voting right. Same status lifecycle, independent
  // of the election right.
  governanceStatus: text("governanceStatus").notNull().default("pending"),
  governanceApprovedBy: text("governanceApprovedBy").notNull().default(""),
  governanceApprovedAt: timestamp("governanceApprovedAt"),
  governanceReason: text("governanceReason").notNull().default(""),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// DAO governance proposals / resolutions.
export const governanceProposals = pgTable("governance_proposals", {
  id: serial("id").primaryKey(),
  reference: text("reference").unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("Resolution"),
  voteType: text("voteType").notNull().default("yes_no_abstain"), // yes_no_abstain | single_choice | multi_choice
  visibility: text("visibility").notNull().default("open"), // open | secret
  eligibilityMode: text("eligibilityMode").notNull().default("all_voting_members"), // all_voting_members | selected_members | category
  eligibleCategory: text("eligibleCategory").notNull().default(""),
  quorum: integer("quorum").notNull().default(0),
  passThreshold: integer("passThreshold").notNull().default(50),
  recordIndividualVotesOnXrpl: boolean("recordIndividualVotesOnXrpl").notNull().default(false),
  anchorResultOnXrpl: boolean("anchorResultOnXrpl").notNull().default(true),
  // Public-website visibility controls (super-admin per proposal).
  showLiveResults: boolean("showLiveResults").notNull().default(false),
  showIndividualVotesPublicly: boolean("showIndividualVotesPublicly").notNull().default(false),
  showMemberNumberPublicly: boolean("showMemberNumberPublicly").notNull().default(false),
  allowVoteChanges: boolean("allowVoteChanges").notNull().default(false),
  bannerImageUrl: text("bannerImageUrl").notNull().default(""),
  bannerAlt: text("bannerAlt").notNull().default(""),
  // Extended proposal detail sections (all optional).
  background: text("background").notNull().default(""),
  objectives: text("objectives").notNull().default(""),
  expectedImpact: text("expectedImpact").notNull().default(""),
  implementationPlan: text("implementationPlan").notNull().default(""),
  timelineText: text("timelineText").notNull().default(""),
  budget: text("budget").notNull().default(""),
  committee: text("committee").notNull().default(""),
  proposalOwner: text("proposalOwner").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft | published | active | closed | archived
  opensAt: timestamp("opensAt"),
  closesAt: timestamp("closesAt"),
  publishedAt: timestamp("publishedAt"),
  closedAt: timestamp("closedAt"),
  createdById: text("createdById"),
  createdByName: text("createdByName").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const governanceProposalOptions = pgTable("governance_proposal_options", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposalId").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const governanceProposalEligibility = pgTable("governance_proposal_eligibility", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposalId").notNull(),
  memberId: integer("memberId").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// One ACTIVE final vote per (proposal, member) — enforced by a partial unique
// index in SQL. Superseded votes are kept with isActive = false.
export const governanceVotes = pgTable("governance_votes", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposalId").notNull(),
  memberId: integer("memberId").notNull(),
  choice: text("choice").notNull(), // yes | no | abstain | option
  optionId: integer("optionId"),
  weight: integer("weight").notNull().default(1),
  receiptCode: text("receiptCode").notNull().unique(),
  isActive: boolean("isActive").notNull().default(true),
  version: integer("version").notNull().default(1),
  xrplStatus: text("xrplStatus").notNull().default("not_recorded"), // not_recorded | pending | verified | failed
  castAt: timestamp("castAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const governanceVoteVersions = pgTable("governance_vote_versions", {
  id: serial("id").primaryKey(),
  voteId: integer("voteId").notNull(),
  proposalId: integer("proposalId").notNull(),
  memberId: integer("memberId").notNull(),
  choice: text("choice").notNull(),
  optionId: integer("optionId"),
  version: integer("version").notNull(),
  supersededAt: timestamp("supersededAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const governanceVoteReceipts = pgTable("governance_vote_receipts", {
  id: serial("id").primaryKey(),
  voteId: integer("voteId").notNull(),
  proposalId: integer("proposalId").notNull(),
  memberId: integer("memberId").notNull(),
  receiptCode: text("receiptCode").notNull().unique(),
  receiptHash: text("receiptHash").notNull(),
  issuedAt: timestamp("issuedAt").notNull().defaultNow(),
})

export const elections = pgTable("elections", {
  id: serial("id").primaryKey(),
  reference: text("reference").unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  eligibilityMode: text("eligibilityMode").notNull().default("all_voting_members"),
  eligibleCategory: text("eligibleCategory").notNull().default(""),
  status: text("status").notNull().default("draft"), // draft | published | active | closed | results_published | archived
  opensAt: timestamp("opensAt"),
  closesAt: timestamp("closesAt"),
  snapshotAt: timestamp("snapshotAt"),
  anchorResultOnXrpl: boolean("anchorResultOnXrpl").notNull().default(true),
  createdById: text("createdById"),
  createdByName: text("createdByName").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const electionPositions = pgTable("election_positions", {
  id: serial("id").primaryKey(),
  electionId: integer("electionId").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  seats: integer("seats").notNull().default(1),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const electionCandidates = pgTable("election_candidates", {
  id: serial("id").primaryKey(),
  electionId: integer("electionId").notNull(),
  positionId: integer("positionId").notNull(),
  memberId: integer("memberId"),
  name: text("name").notNull(),
  organization: text("organization").notNull().default(""),
  manifesto: text("manifesto").notNull().default(""),
  photo: text("photo"),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const electionVoterSnapshots = pgTable("election_voter_snapshots", {
  id: serial("id").primaryKey(),
  electionId: integer("electionId").notNull(),
  memberId: integer("memberId").notNull(),
  membershipId: text("membershipId").notNull().default(""),
  memberName: text("memberName").notNull().default(""),
  publicId: text("publicId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const electionParticipation = pgTable("election_participation", {
  id: serial("id").primaryKey(),
  electionId: integer("electionId").notNull(),
  memberId: integer("memberId").notNull(),
  participatedAt: timestamp("participatedAt").notNull().defaultNow(),
  xrplStatus: text("xrplStatus").notNull().default("not_recorded"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Secret ballot. voterTag is a keyed HMAC of the member — it prevents double
// voting and allows re-voting without a plaintext identity→selection link.
export const electionBallots = pgTable("election_ballots", {
  id: serial("id").primaryKey(),
  electionId: integer("electionId").notNull(),
  voterTag: text("voterTag").notNull(),
  ballotToken: text("ballotToken").notNull().unique(),
  encryptedSelections: text("encryptedSelections").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  version: integer("version").notNull().default(1),
  castAt: timestamp("castAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const electionBallotVersions = pgTable("election_ballot_versions", {
  id: serial("id").primaryKey(),
  ballotId: integer("ballotId").notNull(),
  electionId: integer("electionId").notNull(),
  encryptedSelections: text("encryptedSelections").notNull(),
  version: integer("version").notNull(),
  supersededAt: timestamp("supersededAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const electionResults = pgTable("election_results", {
  id: serial("id").primaryKey(),
  electionId: integer("electionId").notNull(),
  positionId: integer("positionId").notNull(),
  candidateId: integer("candidateId").notNull(),
  votes: integer("votes").notNull().default(0),
  isWinner: boolean("isWinner").notNull().default(false),
  resultHash: text("resultHash"),
  computedAt: timestamp("computedAt").notNull().defaultNow(),
})

export const governanceResults = pgTable("governance_results", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposalId").notNull(),
  eligibleCount: integer("eligibleCount").notNull().default(0),
  totalVotes: integer("totalVotes").notNull().default(0),
  yesCount: integer("yesCount").notNull().default(0),
  noCount: integer("noCount").notNull().default(0),
  abstainCount: integer("abstainCount").notNull().default(0),
  optionTally: text("optionTally").notNull().default(""), // JSON
  outcome: text("outcome").notNull().default("pending"), // pending | passed | failed | no_quorum
  resultHash: text("resultHash"),
  computedAt: timestamp("computedAt").notNull().defaultNow(),
})

export const xrplTransactionQueue = pgTable("xrpl_transaction_queue", {
  id: serial("id").primaryKey(),
  jobType: text("jobType").notNull(), // vote | election_participation | result_anchor
  refTable: text("refTable").notNull(),
  refId: integer("refId").notNull(),
  payloadHash: text("payloadHash").notNull(),
  payload: text("payload").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | processing | submitted | verified | failed
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("maxAttempts").notNull().default(5),
  lastError: text("lastError").notNull().default(""),
  idempotencyKey: text("idempotencyKey").notNull().unique(),
  nextRunAt: timestamp("nextRunAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const xrplTransactions = pgTable("xrpl_transactions", {
  id: serial("id").primaryKey(),
  queueId: integer("queueId"),
  jobType: text("jobType").notNull(),
  refTable: text("refTable").notNull(),
  refId: integer("refId").notNull(),
  network: text("network").notNull().default("testnet"),
  txHash: text("txHash").unique(),
  ledgerIndex: integer("ledgerIndex"),
  account: text("account").notNull().default(""),
  memoHash: text("memoHash").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | submitted | verified | failed
  validatedAt: timestamp("validatedAt"),
  rawResult: text("rawResult").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const xrplAnchors = pgTable("xrpl_anchors", {
  id: serial("id").primaryKey(),
  anchorType: text("anchorType").notNull(), // proposal_result | election_result
  refId: integer("refId").notNull(),
  resultHash: text("resultHash").notNull(),
  txHash: text("txHash"),
  network: text("network").notNull().default("testnet"),
  status: text("status").notNull().default("pending"), // pending | submitted | verified | failed
  anchoredAt: timestamp("anchoredAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const governanceSettings = pgTable("governance_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const governanceProposalDocuments = pgTable("governance_proposal_documents", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposalId")
    .notNull()
    .references(() => governanceProposals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  fileUrl: text("fileUrl").notNull(),
  fileName: text("fileName").notNull().default(""),
  fileType: text("fileType").notNull().default(""),
  fileSize: integer("fileSize").notNull().default(0),
  uploadedById: text("uploadedById"),
  uploadedByName: text("uploadedByName").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const governanceProposalComments = pgTable("governance_proposal_comments", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposalId")
    .notNull()
    .references(() => governanceProposals.id, { onDelete: "cascade" }),
  userId: text("userId"),
  memberId: integer("memberId"),
  authorName: text("authorName").notNull().default(""),
  authorRole: text("authorRole").notNull().default("member"),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const governanceAuditLogs = pgTable("governance_audit_logs", {
  id: serial("id").primaryKey(),
  actorId: text("actorId"),
  actorName: text("actorName").notNull().default(""),
  actorRole: text("actorRole").notNull().default(""),
  action: text("action").notNull(),
  entityType: text("entityType").notNull().default(""),
  entityId: text("entityId").notNull().default(""),
  detail: text("detail").notNull().default(""), // JSON
  ipAddress: text("ipAddress").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Email template management ---------------------------------------------

export const emailTemplates = pgTable("email_templates", {
  key: text("key").primaryKey(),
  publishedContent: jsonb("published_content").$type<EmailContent>(),
  publishedVersion: integer("published_version").notNull().default(0),
  publishedAt: timestamp("published_at"),
  publishedBy: text("published_by"),
  draftContent: jsonb("draft_content").$type<EmailContent>(),
  draftUpdatedAt: timestamp("draft_updated_at"),
  draftUpdatedBy: text("draft_updated_by"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const emailTemplateVersions = pgTable("email_template_versions", {
  id: serial("id").primaryKey(),
  templateKey: text("template_key").notNull(),
  version: integer("version").notNull(),
  content: jsonb("content").$type<EmailContent>().notNull(),
  publishedBy: text("published_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  templateKey: text("template_key"),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(), // sent | failed | skipped
  error: text("error"),
  isTest: boolean("is_test").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// --- Email automations ------------------------------------------------------

export const emailAutomations = pgTable("email_automations", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  lastRunAt: timestamp("last_run_at"),
  lastSentAt: timestamp("last_sent_at"),
  totalSent: integer("total_sent").notNull().default(0),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const emailAutomationRuns = pgTable("email_automation_runs", {
  id: serial("id").primaryKey(),
  automationKey: text("automation_key").notNull(),
  trigger: text("trigger").notNull(),
  sent: integer("sent").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  note: text("note").notNull().default(""),
  actor: text("actor"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
})

export const emailSends = pgTable("email_sends", {
  id: serial("id").primaryKey(),
  automationKey: text("automation_key").notNull(),
  dedupeKey: text("dedupe_key").notNull().unique(),
  recipient: text("recipient").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const emailSuppressions = pgTable("email_suppressions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  topic: text("topic").notNull(),
  reason: text("reason").notNull().default("unsubscribed"),
  source: text("source").notNull().default("recipient"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const newsletterIssues = pgTable("newsletter_issues", {
  id: serial("id").primaryKey(),
  weekKey: text("week_key").notNull().unique(),
  status: text("status").notNull().default("draft"),
  content: jsonb("content").$type<EmailContent>().notNull(),
  sentCount: integer("sent_count").notNull().default(0),
  sentAt: timestamp("sent_at"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// --- Membership certificates (QR verification) ------------------------------
// Each issued certificate carries a random, non-guessable token encoded in its
// QR code. Regenerating revokes the previous token so old prints stop verifying.
export const membershipCertificates = pgTable("membership_certificates", {
  id: serial("id").primaryKey(),
  memberId: integer("memberId")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("issued"), // issued | revoked
  issuedAt: timestamp("issuedAt").notNull().defaultNow(),
  expiresAt: timestamp("expiresAt"),
  revokedAt: timestamp("revokedAt"),
  revokedReason: text("revokedReason"),
  issuedBy: text("issuedBy"),
})

// --- Verified KOL (Key Opinion Leader) -------------------------------------
// One profile per existing member. Membership approval and KOL verification
// are separate processes; this table never creates member accounts.
export type KolPlatform = {
  platform: string
  url: string
  followers: number
  avgViews: number
  engagement: number
  ownershipVerified: boolean
}

export type KolEvidence = { key: string; name: string; uploadedAt: string }

export const kolProfiles = pgTable("kol_profiles", {
  id: serial("id").primaryKey(),
  memberId: integer("memberId")
    .notNull()
    .unique()
    .references(() => members.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  // draft | pending | under_review | info_required | verified | rejected | expired | revoked
  status: text("status").notNull().default("draft"),
  fullName: text("fullName").notNull().default(""),
  professionalName: text("professionalName").notNull().default(""),
  photo: text("photo").notNull().default(""),
  country: text("country").notNull().default("Pakistan"),
  city: text("city").notNull().default(""),
  organization: text("organization").notNull().default(""),
  title: text("title").notNull().default(""),
  bio: text("bio").notNull().default(""),
  expertise: jsonb("expertise").$type<string[]>().notNull().default([]),
  platforms: jsonb("platforms").$type<KolPlatform[]>().notNull().default([]),
  monthlyReach: integer("monthlyReach").notNull().default(0),
  mediaAppearances: text("mediaAppearances").notNull().default(""),
  collaborations: text("collaborations").notNull().default(""),
  achievements: text("achievements").notNull().default(""),
  collabInterests: text("collabInterests").notNull().default(""),
  evidence: jsonb("evidence").$type<KolEvidence[]>().notNull().default([]),
  evidenceNotes: text("evidenceNotes").notNull().default(""),
  identityVerified: boolean("identityVerified").notNull().default(false),
  metricsVerified: boolean("metricsVerified").notNull().default(false),
  adminNote: text("adminNote").notNull().default(""),
  invitedAt: timestamp("invitedAt"),
  submittedAt: timestamp("submittedAt"),
  verifiedAt: timestamp("verifiedAt"),
  expiresAt: timestamp("expiresAt"),
  reminderSentAt: timestamp("reminderSentAt"),
  statsUpdatedAt: timestamp("statsUpdatedAt"),
  reviewedBy: text("reviewedBy"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const kolAuditLog = pgTable("kol_audit_log", {
  id: serial("id").primaryKey(),
  memberId: integer("memberId")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  fromStatus: text("fromStatus"),
  toStatus: text("toStatus"),
  note: text("note").notNull().default(""),
  actor: text("actor").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- VAAP AI Assistant: one row per model request -----------------------------
// Cost is stored in micro-USD (1 = USD 0.000001) so sums stay exact integers.

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  requestId: text("requestId").notNull().unique(),
  userId: text("userId"),
  sessionId: text("sessionId").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("inputTokens").notNull().default(0),
  outputTokens: integer("outputTokens").notNull().default(0),
  cachedInputTokens: integer("cachedInputTokens").notNull().default(0),
  reasoningTokens: integer("reasoningTokens").notNull().default(0),
  toolCalls: integer("toolCalls").notNull().default(0),
  costMicroUsd: integer("costMicroUsd").notNull().default(0),
  pricingVersion: text("pricingVersion").notNull().default(""),
  language: text("language").notNull().default("en"),
  status: text("status").notNull().default("ok"), // ok | error | blocked_budget | blocked_quota | disabled | free_fallback
  latencyMs: integer("latencyMs").notNull().default(0),
  conversationId: text("conversationId"),
  messageId: text("messageId"),
  provider: text("provider").notNull().default(""),
  question: text("question").notNull().default(""),
  answer: text("answer").notNull().default(""),
  topic: text("topic").notNull().default("general"),
  tier: text("tier").notNull().default("guest"),
  answered: boolean("answered"),
  generationIds: text("generationIds").notNull().default(""),
  actualCostMicroUsd: integer("actualCostMicroUsd"),
  reconciledAt: timestamp("reconciledAt"),
  errorMessage: text("errorMessage").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Admin-approved content the assistant retrieves from (Postgres full-text search, no embedding cost).
export const aiKnowledgeSources = pgTable("ai_knowledge_sources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  kind: text("kind").notNull(), // text | url | pdf | docx
  category: text("category").notNull().default("general"),
  sourceUrl: text("sourceUrl"),
  fileName: text("fileName"),
  content: text("content").notNull().default(""),
  charCount: integer("charCount").notNull().default(0),
  chunkCount: integer("chunkCount").notNull().default(0),
  active: boolean("active").notNull().default(true),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  version: integer("version").notNull().default(1),
  reviewedBy: text("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote").notNull().default(""),
  createdBy: text("createdBy"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const aiKnowledgeChunks = pgTable("ai_knowledge_chunks", {
  id: serial("id").primaryKey(),
  sourceId: integer("sourceId")
    .notNull()
    .references(() => aiKnowledgeSources.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  content: text("content").notNull(),
})

// Snapshot of a knowledge source each time its content is added, edited or re-read.
export const aiKnowledgeVersions = pgTable("ai_knowledge_versions", {
  id: serial("id").primaryKey(),
  sourceId: integer("sourceId")
    .notNull()
    .references(() => aiKnowledgeSources.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  action: text("action").notNull(), // created | edited | refreshed | approved | rejected
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  note: text("note").notNull().default(""),
  changedBy: text("changedBy"),
  changedByName: text("changedByName").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Single-row (id = 1) Super Admin configuration for Ask VAAP AI.
export const aiSettings = pgTable("ai_settings", {
  id: integer("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedBy: text("updatedBy"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Encrypted AI provider credentials (AES-256-GCM). Only server code can decrypt; the plaintext key never leaves the server.
export const aiProviderCredentials = pgTable("ai_provider_credentials", {
  provider: text("provider").primaryKey(),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  authTag: text("authTag").notNull(),
  keyHint: text("keyHint").notNull(),
  status: text("status").notNull().default("untested"),
  lastError: text("lastError"),
  lastTestedAt: timestamp("lastTestedAt"),
  updatedBy: text("updatedBy"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Worst-case cost held while a paid request is in flight, so concurrent requests cannot overspend.
export const aiBudgetReservations = pgTable("ai_budget_reservations", {
  requestId: text("requestId").primaryKey(),
  amountMicroUsd: integer("amountMicroUsd").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Atomic per-subject question counter for the daily allowance. `day` is the
// calendar date in the configured reset time zone. Subjects: user:<id>, guest:<sid>, ip:<hash>.
export const aiDailyUsage = pgTable(
  "ai_daily_usage",
  {
    subject: text("subject").notNull(),
    day: text("day").notNull(),
    count: integer("count").notNull().default(0),
    blocked: integer("blocked").notNull().default(0),
    tier: text("tier").notNull().default("guest"),
    dailyLimit: integer("dailyLimit").notNull().default(0),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.subject, t.day] })],
)

export const aiUpgradeClicks = pgTable("ai_upgrade_clicks", {
  id: serial("id").primaryKey(),
  userId: text("userId"),
  sessionId: text("sessionId"),
  tier: text("tier").notNull().default("guest"),
  target: text("target").notNull(), // plans | status | signin
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// One row per budget threshold notification per period, so each alert is sent once.
export const aiBudgetAlerts = pgTable(
  "ai_budget_alerts",
  {
    period: text("period").notNull(), // e.g. month:2026-11 or day:2026-11-11
    threshold: integer("threshold").notNull(),
    spentMicroUsd: integer("spentMicroUsd").notNull().default(0),
    sentAt: timestamp("sentAt").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.period, t.threshold] })],
)

// Admin-reviewed replacement answers. Only `approved` rows are retrieved by the assistant.
export const aiAnswerCorrections = pgTable("ai_answer_corrections", {
  id: serial("id").primaryKey(),
  usageLogId: integer("usageLogId"),
  question: text("question").notNull(),
  originalAnswer: text("originalAnswer").notNull().default(""),
  correctedAnswer: text("correctedAnswer").notNull(),
  keywords: text("keywords").notNull().default(""),
  // Model-generated English / Urdu / Roman Urdu paraphrases used for retrieval, one per line.
  variants: text("variants").notNull().default(""),
  indexedAt: timestamp("indexedAt"),
  useCount: integer("useCount").notNull().default(0),
  lastUsedAt: timestamp("lastUsedAt"),
  topic: text("topic").notNull().default("general"),
  status: text("status").notNull().default("draft"), // draft | pending | approved | rejected | withdrawn
  version: integer("version").notNull().default(1),
  createdBy: text("createdBy"),
  createdByName: text("createdByName").notNull().default(""),
  reviewedBy: text("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const aiCorrectionVersions = pgTable("ai_correction_versions", {
  id: serial("id").primaryKey(),
  correctionId: integer("correctionId")
    .notNull()
    .references(() => aiAnswerCorrections.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  action: text("action").notNull(), // created | edited | submitted | approved | rejected | withdrawn
  correctedAnswer: text("correctedAnswer").notNull().default(""),
  note: text("note").notNull().default(""),
  changedBy: text("changedBy"),
  changedByName: text("changedByName").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const aiFeedback = pgTable("ai_feedback", {
  id: serial("id").primaryKey(),
  requestId: text("requestId"),
  conversationId: text("conversationId"),
  messageId: text("messageId").notNull().unique(),
  rating: integer("rating").notNull(), // 1 helpful, -1 not helpful
  comment: text("comment").notNull().default(""),
  question: text("question").notNull().default(""),
  userId: text("userId"),
  sessionId: text("sessionId").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
