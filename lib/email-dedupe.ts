import "server-only"

import { eq, like, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { emailSends } from "@/lib/db/schema"

/**
 * Atomically claims a one-time send. The unique `dedupe_key` means only one of any
 * number of concurrent or repeated calls (double submits, refreshes, retries) wins.
 * Returns a release function to call when the send fails so it can be retried,
 * or null when this key has already been sent.
 */
export async function claimEmailOnce(scope: string, dedupeKey: string, recipient: string) {
  const [claimed] = await db
    .insert(emailSends)
    .values({ automationKey: scope, dedupeKey, recipient })
    .onConflictDoNothing()
    .returning({ id: emailSends.id })
  if (!claimed) return null
  return async () => {
    await db.delete(emailSends).where(eq(emailSends.id, claimed.id))
  }
}

export const registrationAlertKey = (rsvpId: number, to: string) => `event-registration:admin:${rsvpId}:${to}`
export const registrationConfirmedKey = (rsvpId: number) => `event-registration:confirmed:${rsvpId}`

/** Clears one registration's send history so re-registering after a cancellation notifies again. */
export async function releaseRegistrationEmailClaims(rsvpId: number) {
  await db
    .delete(emailSends)
    .where(
      or(
        eq(emailSends.dedupeKey, registrationConfirmedKey(rsvpId)),
        like(emailSends.dedupeKey, `event-registration:admin:${rsvpId}:%`),
      ),
    )
}
