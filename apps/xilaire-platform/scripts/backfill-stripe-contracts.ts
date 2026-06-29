import dotenv from "dotenv"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

/* -------------------------------------------------
   ENV (EXPLICIT — OPS SAFE)
------------------------------------------------- */
dotenv.config({ path: ".env.local" })

if (!process.env.STRIPE_SECRET_KEY_PLATFORM) {
  throw new Error("STRIPE_SECRET_KEY_PLATFORM is not set")
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY_PLATFORM is not set")
}

/* -------------------------------------------------
   STRIPE CLIENT (NO apiVersion — BY DESIGN)
------------------------------------------------- */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_PLATFORM)

/* -------------------------------------------------
   SUPABASE — SERVICE ROLE
------------------------------------------------- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type StripeSubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end: number
  cancel_at_period_end: boolean
}

/* -------------------------------------------------
   BACKFILL
------------------------------------------------- */
async function backfill() {
  console.log("🔄 Starting Stripe subscription backfill…")

  const subscriptions = await stripe.subscriptions.list({
    status: "all",
    limit: 100,
  })

  for (const rawSub of subscriptions.data) {
    const sub = rawSub as StripeSubscriptionWithPeriod
    const { org_id, plan, platform } = sub.metadata ?? {}

    if (!org_id || platform !== "xilaire-platform") {
      console.warn(
        `⚠️ Skipping subscription ${sub.id} — invalid metadata`
      )
      continue
    }

    const { error } = await supabase
      .from("contracts")
      .upsert(
        {
          org_id,
          plan,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer as string,
          stripe_subscription_status: sub.status,
          current_period_end: new Date(
            sub.current_period_end * 1000
          ).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" }
      )

    if (error) {
      console.error(`❌ Failed to sync ${sub.id}`, error)
    } else {
      console.log(`✅ Synced ${sub.id}`)
    }
  }

  console.log("✅ Stripe contract backfill complete")
}

backfill().catch((err) => {
  console.error("❌ Backfill failed", err)
  process.exit(1)
})
