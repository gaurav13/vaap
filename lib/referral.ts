// Shared referral / reward helpers used by server actions and UI.

export const REFERRAL_COOKIE = "vaap_ref"
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 60 // 60 days

export type FeeKind = "admission" | "annual" | "renewal"

export const COMMISSIONABLE_FEE_OPTIONS: { value: FeeKind; label: string }[] = [
  { value: "admission", label: "Admission Fee" },
  { value: "annual", label: "Annual Membership Fee" },
  { value: "renewal", label: "Renewal Fee" },
]

// Extract a whole-rupee integer from strings like "PKR 30,000", "30000", "Rs 30,000.00".
export function parseMoney(input: string | null | undefined): number {
  if (!input) return 0
  const digits = String(input).replace(/[^0-9.]/g, "")
  if (!digits) return 0
  const n = Number.parseFloat(digits)
  return Number.isFinite(n) ? Math.round(n) : 0
}

export function formatPKR(amount: number, currency = "PKR"): string {
  const n = Number.isFinite(amount) ? amount : 0
  return `${currency} ${n.toLocaleString("en-PK")}`
}

// Build a referral code from a person/campaign name + numeric sequence.
// e.g. buildReferralCode("Hinza Asif", 1) -> "VAAP-HINZA-001"
export function buildReferralCode(name: string, seq: number, prefix = "VAAP"): string {
  const token =
    (name || "REF")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .trim()
      .split(" ")[0]
      ?.slice(0, 10) || "REF"
  return `${prefix}-${token}-${String(seq).padStart(3, "0")}`
}

export function buildPartnerCode(seq: number): string {
  return `KOL-${String(seq).padStart(4, "0")}`
}

export function referralUrl(code: string, origin?: string): string {
  const base = origin?.replace(/\/$/, "") ?? ""
  return `${base}/join?ref=${encodeURIComponent(code)}`
}

export type CommissionRuleLike = {
  rewardType: string
  commissionPercent: string
  fixedAmount: number
  commissionableFees: string
  currency?: string
}

export type ApplicationFees = {
  admission: number
  annual: number
  renewal?: number
}

// Sum only the fee kinds a rule marks as commissionable.
export function commissionableTotal(rule: CommissionRuleLike, fees: ApplicationFees): number {
  const kinds = rule.commissionableFees
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  let total = 0
  if (kinds.includes("admission")) total += fees.admission || 0
  if (kinds.includes("annual")) total += fees.annual || 0
  if (kinds.includes("renewal")) total += fees.renewal || 0
  return total
}

export type RewardComputation = {
  eligibleAmount: number
  rewardAmount: number
  rate: string // human label of the applied rate
}

// Pure reward math. Percentage: eligible x %, Fixed: flat amount, None: 0.
export function computeReward(rule: CommissionRuleLike, fees: ApplicationFees): RewardComputation {
  if (rule.rewardType === "none") {
    return { eligibleAmount: 0, rewardAmount: 0, rate: "No reward" }
  }
  if (rule.rewardType === "fixed") {
    return {
      eligibleAmount: commissionableTotal(rule, fees),
      rewardAmount: Math.max(0, Math.round(rule.fixedAmount || 0)),
      rate: formatPKR(rule.fixedAmount || 0, rule.currency),
    }
  }
  // percentage
  const eligible = commissionableTotal(rule, fees)
  const pct = Number.parseFloat(rule.commissionPercent || "0") || 0
  const reward = Math.max(0, Math.round((eligible * pct) / 100))
  return { eligibleAmount: eligible, rewardAmount: reward, rate: `${pct}%` }
}

// Human labels for the many referral / reward statuses.
export const REFERRAL_STATUS_LABELS: Record<string, string> = {
  invited: "Invited",
  application_started: "Application Started",
  application_submitted: "Application Submitted",
  payment_pending: "Payment Pending",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  reward_eligible: "Reward Eligible",
  reward_approved: "Reward Approved",
  paid: "Paid",
  cancelled: "Cancelled",
}

export const REWARD_STATUS_LABELS: Record<string, string> = {
  pending_eligibility: "Pending Eligibility",
  eligible: "Eligible",
  under_review: "Under Review",
  approved: "Approved",
  payment_processing: "Payment Processing",
  paid: "Paid",
  cancelled: "Cancelled",
  reversed: "Reversed",
}
