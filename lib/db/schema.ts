import { pgTable, text, timestamp, boolean, serial, integer } from "drizzle-orm/pg-core"

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
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
  description: text("description").notNull().default(""),
  location: text("location").notNull().default(""),
  timeLabel: text("timeLabel").notNull().default(""),
  startsAt: timestamp("startsAt").notNull().defaultNow(),
  published: boolean("published").notNull().default(true),
  // Public-facing host / organizer name (e.g. a member's org or "VAAP").
  hostName: text("hostName").notNull().default(""),
  coverImage: text("coverImage"),
  // Set when a member submits the event; null for admin-created events.
  submittedByUserId: text("submittedByUserId"),
  submittedByName: text("submittedByName").notNull().default(""),
  // "approved" | "pending" | "rejected". Member submissions start "pending".
  status: text("status").notNull().default("approved"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Event RSVPs (Luma-style participant list) -----------------------------

export const eventRsvps = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("eventId").notNull(),
  // Set when a signed-in user RSVPs; null for guest RSVPs.
  userId: text("userId"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

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
  admissionFee: text("admissionFee"),
  annualFee: text("annualFee"),
  totalAmount: text("totalAmount"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  // false = applicant saved their details but abandoned before final submit
  // (e.g. stopped at the payment stage). true = full application submitted.
  completed: boolean("completed").notNull().default(false),
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
  createdAt: timestamp("createdAt").notNull().defaultNow(),
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
