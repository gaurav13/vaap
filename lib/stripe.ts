import "server-only"

import Stripe from "stripe"

// The installed `stripe` package pins its own API version, so we don't set one
// here. Secret key is injected by the Vercel Stripe integration.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
