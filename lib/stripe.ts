import "server-only"

import Stripe from "stripe"

// The installed `stripe` package pins its own API version, so we don't set one
// here. The live secret key is stored in STRIPE_ACCESS_TOKEN_2 (validated against
// a live account); fall back to the integration-provided keys if it's unset.
const secretKey =
  process.env.STRIPE_ACCESS_TOKEN_3 ||
  process.env.STRIPE_ACCESS_TOKEN ||
  process.env.STRIPE_SECRET_KEY

export const stripe = new Stripe(secretKey as string)
