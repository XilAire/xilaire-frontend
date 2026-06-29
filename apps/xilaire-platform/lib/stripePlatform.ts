import Stripe from "stripe"

/* =================================================
   STRIPE MODE
================================================= */

const STRIPE_MODE = process.env.STRIPE_MODE ?? "test"

/* =================================================
   LOAD KEYS SAFELY
================================================= */

const TEST_KEY = process.env.STRIPE_SECRET_KEY_TEST
const LIVE_KEY = process.env.STRIPE_SECRET_KEY_LIVE

if (!TEST_KEY) {
  console.warn("⚠️ STRIPE_SECRET_KEY_TEST missing")
}

if (!LIVE_KEY) {
  console.warn("⚠️ STRIPE_SECRET_KEY_LIVE missing")
}

/* =================================================
   SELECT ACTIVE KEY
================================================= */

const ACTIVE_KEY =
  STRIPE_MODE === "live" ? LIVE_KEY : TEST_KEY

if (!ACTIVE_KEY) {
  throw new Error(
    `Stripe key missing for mode: ${STRIPE_MODE}`
  )
}

/* =================================================
   STRIPE INSTANCE
================================================= */

export const stripe = new Stripe(ACTIVE_KEY, {
  apiVersion: "2025-08-27.basil",
})