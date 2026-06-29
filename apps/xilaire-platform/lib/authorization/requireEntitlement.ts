import { createClient } from "@supabase/supabase-js"

/* -------------------------------------------------
   SUPABASE — SERVICE ROLE (AUTHZ CHECKS)
------------------------------------------------- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
export type EntitlementResult = {
  allowed: boolean
  quantity?: number
  reason?: string
}

/* -------------------------------------------------
   REQUIRE ENTITLEMENT (AUTHORITATIVE)
------------------------------------------------- */
export async function requireEntitlement(
  org_id: string,
  entitlement_key: string
): Promise<EntitlementResult> {
  /* -----------------------------------------------
     1️⃣ ACTIVE CONTRACT
  ------------------------------------------------ */
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, stripe_subscription_status, current_period_end")
    .eq("org_id", org_id)
    .in("stripe_subscription_status", ["active", "trialing"])
    .single()

  if (!contract) {
    return {
      allowed: false,
      reason: "No active contract",
    }
  }

  if (
    contract.current_period_end &&
    new Date(contract.current_period_end) < new Date()
  ) {
    return {
      allowed: false,
      reason: "Contract expired",
    }
  }

  /* -----------------------------------------------
     2️⃣ ENTITLEMENT
  ------------------------------------------------ */
  const { data: entitlement } = await supabase
    .from("contract_entitlements")
    .select("quantity")
    .eq("contract_id", contract.id)
    .eq("entitlement_key", entitlement_key)
    .single()

  if (!entitlement) {
    return {
      allowed: false,
      reason: "Entitlement not granted",
    }
  }

  return {
    allowed: true,
    quantity: entitlement.quantity ?? undefined,
  }
}
