// apps/xilaire-platform/lib/entitlements/recordEntitlementUsage.ts

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

export async function recordEntitlementUsage(params: {
  contractId: string
  entitlementType: string
  quantity: number
  workItemId: string
  usageType: string
}) {
  const {
    contractId,
    entitlementType,
    quantity,
    workItemId,
    usageType,
  } = params

  const { error } = await supabase.rpc("consume_entitlement", {
    p_contract_id: contractId,
    p_entitlement_type: entitlementType,
    p_quantity: quantity,
    p_work_item_id: workItemId,
    p_usage_type: usageType,
  })

  if (error) {
    throw new Error(`Entitlement consumption failed: ${error.message}`)
  }
}