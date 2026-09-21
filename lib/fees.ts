// Card payments incur a processing fee that Stripe charges VAAP. To keep the
// membership fee whole, that cost is passed on to the applicant as a separate
// line item — but ONLY for card payments. Crypto payments are charged at the
// plain membership total with no surcharge.
export const CARD_FEE_RATE = 0.057
export const CARD_FEE_LABEL = "5.7%"

/** The card processing surcharge (in whole PKR) for a given base amount. */
export function cardProcessingFee(basePkr: number): number {
  if (basePkr <= 0) return 0
  return Math.round(basePkr * CARD_FEE_RATE)
}
