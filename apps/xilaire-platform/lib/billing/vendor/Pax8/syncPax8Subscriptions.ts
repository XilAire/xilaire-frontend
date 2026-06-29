import { createServerSupabaseClient } from "@/lib/supabaseServer"

/* -------------------------------------------------
   TYPES — Pax8 Shape (Minimal, Explicit)
------------------------------------------------- */
interface Pax8Subscription {
  id: string
  sku: string
  productName: string
  quantity: number
  unitCost: number
  billingCycle: "monthly" | "annual"
  status: "active" | "suspended" | "cancelled"
  customer: {
    id: string
    externalId: string // MUST map to XilAire org_id
  }
}

/* -------------------------------------------------
   PAX8 API CLIENT (READ-ONLY)
------------------------------------------------- */
async function fetchPax8Subscriptions(): Promise<Pax8Subscription[]> {
  const res = await fetch("https://api.pax8.com/v1/subscriptions", {
    headers: {
      Authorization: `Bearer ${process.env.PAX8_API_TOKEN}`,
      Accept: "application/json",
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Pax8 API error: ${body}`)
  }

  return res.json()
}

/* -------------------------------------------------
   NORMALIZER — Pax8 → vendor_subscriptions
------------------------------------------------- */
function normalize(sub: Pax8Subscription) {
  if (!sub.customer?.externalId) {
    throw new Error(
      `Missing org mapping for Pax8 customer on subscription ${sub.id}`
    )
  }

  return {
    org_id: sub.customer.externalId,
    vendor: "pax8",
    vendor_subscription_id: sub.id,
    sku: sub.sku,
    product_name: sub.productName,
    quantity: sub.quantity,
    unit_cost: sub.unitCost,
    billing_cycle: sub.billingCycle,
    status: sub.status,
    synced_at: new Date().toISOString(),
  }
}

/* -------------------------------------------------
   SYNC JOB — SERVER ONLY, IDEMPOTENT
------------------------------------------------- */
export async function syncPax8Subscriptions() {
  // ✅ CORRECT FOR YOUR REPO
  const supabase = await createServerSupabaseClient()

  /* -------------------------------------------
     Fetch from Pax8
  -------------------------------------------- */
  const pax8Subs = await fetchPax8Subscriptions()

  if (!pax8Subs.length) {
    return {
      vendor: "pax8",
      processed: 0,
      message: "No subscriptions returned from Pax8",
    }
  }

  /* -------------------------------------------
     Normalize
  -------------------------------------------- */
  const records = pax8Subs.map(normalize)

  /* -------------------------------------------
     Upsert into vendor_subscriptions
  -------------------------------------------- */
  const { error } = await supabase
    .from("vendor_subscriptions")
    .upsert(records, {
      onConflict: "vendor,vendor_subscription_id",
    })

  if (error) throw error

  return {
    vendor: "pax8",
    processed: records.length,
    status: "success",
  }
}
