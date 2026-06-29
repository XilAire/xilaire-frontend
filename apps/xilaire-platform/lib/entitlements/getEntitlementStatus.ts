// apps/xilaire-platform/lib/entitlements/getEntitlementStatus.ts

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type EntitlementStatus = {
  state: "ok" | "warning" | "grace" | "blocked"
  remaining: number
  allocated: number
  used: number
  message: string | null
}

export async function getEntitlementStatus(
  contractId: string,
  entitlementType: string
): Promise<EntitlementStatus> {
  const { data, error } = await supabase
    .from("contract_entitlement_balance")
    .select(
      "quantity_allocated, quantity_used, quantity_remaining"
    )
    .eq("contract_id", contractId)
    .eq("entitlement_type", entitlementType)
    .single()

  if (error || !data) {
    return {
      state: "blocked",
      remaining: 0,
      allocated: 0,
      used: 0,
      message: "Entitlement not found",
    }
  }

  const allocated = Number(data.quantity_allocated)
  const used = Number(data.quantity_used)
  const remaining = Number(data.quantity_remaining)

  // UX thresholds (CONFIGURABLE)
  const WARNING_THRESHOLD = allocated * 0.2
  const GRACE_LIMIT = 0

  if (remaining <= GRACE_LIMIT) {
    return {
      state: "grace",
      remaining,
      allocated,
      used,
      message:
        "You’ve exceeded your plan limits. Continued usage may incur overages.",
    }
  }

  if (remaining <= WARNING_THRESHOLD) {
    return {
      state: "warning",
      remaining,
      allocated,
      used,
      message:
        "You’re approaching your monthly usage limit.",
    }
  }

  return {
    state: "ok",
    remaining,
    allocated,
    used,
    message: null,
  }
}