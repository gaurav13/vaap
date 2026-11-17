export type CaseStatus =
  | "pending_payment"
  | "payment_received"
  | "pending_verification"
  | "approved"
  | "rejected"
  | "suspended"

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  pending_payment: "Pending Payment",
  payment_received: "Payment Received",
  pending_verification: "Pending Verification",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
}

export const CASE_STATUSES = Object.keys(CASE_STATUS_LABEL) as CaseStatus[]
