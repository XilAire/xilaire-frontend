import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Intentionally omit apiVersion
  // Stripe SDK types always track the latest API version
})
