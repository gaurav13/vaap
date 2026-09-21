"use server"

import { stripe } from "@/lib/stripe"
import { getMembershipPlans } from "@/app/actions/cms"

// Parse a fee label like "PKR 50,000" into an integer amount of rupees.
function feeToNumber(value: string | null | undefined): number {
  const digits = (value ?? "").replace(/[^\d]/g, "")
  return digits ? Number.parseInt(digits, 10) : 0
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type MembershipCheckoutResult =
  | { ok: false; error: string }
  | { ok: true; free: true; amount: 0 }
  | { ok: true; free: false; amount: number; clientSecret: string; sessionId: string }

/**
 * Creates an embedded Stripe Checkout session for a membership plan.
 *
 * Security: the amount is ALWAYS recomputed on the server from the plan stored
 * in the database (looked up by id). The client only chooses which plan — it can
 * never influence the price. Complimentary (zero-fee) plans return `free: true`
 * so the UI can skip card entry entirely.
 */
export async function createMembershipCheckout(input: {
  planId: number
  name: string
  email: string
}): Promise<MembershipCheckoutResult> {
  const plans = await getMembershipPlans()
  const plan = plans.find((p) => p.id === input.planId)
  if (!plan) return { ok: false, error: "The selected membership could not be found." }

  const totalPkr = feeToNumber(plan.admissionFee) + feeToNumber(plan.annualFee)
  if (totalPkr <= 0) {
    // Nothing to charge for a complimentary membership.
    return { ok: true, free: true, amount: 0 }
  }

  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()

  try {
    const session = await stripe.checkout.sessions.create({
      // `embedded_page` is the current value (stripe-node v21+ / API 2026-03-25.dahlia).
      ui_mode: "embedded_page",
      mode: "payment",
      // Keep the applicant on our wizard — no redirect after payment.
      redirect_on_completion: "never",
      payment_method_types: ["card"],
      customer_email: EMAIL_RE.test(email) ? email : undefined,
      line_items: [
        {
          price_data: {
            currency: "pkr",
            // PKR is a 2-decimal currency for Stripe, so send paisa.
            unit_amount: totalPkr * 100,
            product_data: {
              name: `${plan.title} — VAAP Membership`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        planId: String(plan.id),
        planTitle: plan.title,
        applicantName: name,
        applicantEmail: email,
      },
    })

    if (!session.client_secret) {
      return { ok: false, error: "Could not start the card payment. Please try again." }
    }

    return {
      ok: true,
      free: false,
      amount: totalPkr,
      clientSecret: session.client_secret,
      sessionId: session.id,
    }
  } catch (err) {
    console.log("[v0] stripe checkout error:", err instanceof Error ? err.message : err)
    return { ok: false, error: "Could not start the card payment. Please try again." }
  }
}

/**
 * Confirms a completed Checkout session was actually paid. Called from the
 * client once Stripe's embedded checkout reports completion, so we never trust
 * the client's word that payment succeeded.
 */
export async function getMembershipPaymentStatus(
  sessionId: string,
): Promise<{ ok: boolean; paid: boolean; status?: string }> {
  if (!sessionId) return { ok: false, paid: false }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return { ok: true, paid: session.payment_status === "paid", status: session.payment_status }
  } catch (err) {
    console.log("[v0] stripe status error:", err instanceof Error ? err.message : err)
    return { ok: false, paid: false }
  }
}
