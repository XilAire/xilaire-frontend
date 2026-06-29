// apps/xilaire-platform/lib/entitlements/evaluateOverage.ts

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

export type OverageResult = {
  isOver: boolean
  overageAmount: number
  message?: string
}

export async function evaluateOverage(params: {
  contractId: string
  entitlementType: string
}): Promise<OverageResult> {
  const { contractId, entitlementType } = params

  const { data, error } = await supabase
    .from("contract_entitlement_balance")
    .select("quantity_remaining")
    .eq("contract_id", contractId)
    .eq("entitlement_type", entitlementType)
    .single()

  if (error || !data) {
    return {
      isOver: false,
      overageAmount: 0,
    }
  }

  const remaining = Number(data.quantity_remaining)

  if (remaining >= 0) {
    return {
      isOver: false,
      overageAmount: 0,
    }
  }

  return {
    isOver: true,
    overageAmount: Math.abs(remaining),
    message: "Entitlement exceeded — operating in grace period",
  }
}