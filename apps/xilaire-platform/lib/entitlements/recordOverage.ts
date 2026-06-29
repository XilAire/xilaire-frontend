// apps/xilaire-platform/lib/entitlements/recordOverage.ts

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

type RecordOverageInput = {
  contract_id: string
  entitlement_type: string
  quantity: number
  work_item_id: string
  usage_type: string
  remaining_after: number
}

export async function recordEntitlementOverage({
  contract_id,
  entitlement_type,
  quantity,
  work_item_id,
  usage_type,
  remaining_after,
}: RecordOverageInput) {
  // This must NEVER block runtime execution
  try {
    await supabase.from("entitlement_overages").insert({
      contract_id,
      entitlement_type,
      quantity,
      work_item_id,
      usage_type,
      remaining_after,
      occurred_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      invoiced: false,
    })
  } catch (err) {
    // Silent failure by design — log only
    console.error("Failed to record entitlement overage", {
      contract_id,
      entitlement_type,
      work_item_id,
      error: err,
    })
  }
}