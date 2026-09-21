// Membership term policy: a VAAP membership is valid for one year (365 days)
// from the registration/join date. These helpers keep that rule in one place so
// activation, the certificate, and every "valid till" display stay in sync.

export const MEMBERSHIP_TERM_DAYS = 365

export function addDays(date: Date | string, days: number) {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

// Expiry for a term that starts on the given join/registration date.
export function computeExpiry(joinedAt: Date | string = new Date()) {
  return addDays(joinedAt, MEMBERSHIP_TERM_DAYS)
}

// The expiry to show/use: prefer the stored value, otherwise derive a one-year
// term from the join date (so legacy records with no stored expiry still work).
export function effectiveExpiry(
  joinedAt: Date | string | null | undefined,
  expiresAt: Date | string | null | undefined,
): Date | null {
  if (expiresAt) return new Date(expiresAt)
  if (joinedAt) return computeExpiry(joinedAt)
  return null
}
