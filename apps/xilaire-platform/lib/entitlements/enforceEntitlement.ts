import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

/* -------------------------------------------------
   ENTITLEMENT POLICY (RUNTIME ONLY)
------------------------------------------------- */
const ENTITLEMENT_POLICY: Record<
  string,
  {
    mode: "hard" | "grace" | "overage"
    grace_limit?: number
  }
> = {
  support_hours: {
    mode: "grace",
    grace_limit: 2,
  },
  managed_users: {
    mode: "hard",
  },
}

type EnforceEntitlementInput = {
  org_id: string
  entitlement_type: string
  quantity: number
  work_item_id: string
  usage_type: string
}

/* -------------------------------------------------
   ADVISORY LOCK KEY (DETERMINISTIC)
------------------------------------------------- */
function hashLockKey(contractId: string, entitlementType: string): number {
  const str = `${contractId}:${entitlementType}`
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }

  return Math.abs(hash)
}

export async function enforceEntitlement({
  org_id,
  entitlement_type,
  quantity,
  work_item_id,
  usage_type,
}: EnforceEntitlementInput) {
  /* ---------------------------------------------
     1. Resolve active contract
  --------------------------------------------- */
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id")
    .eq("org_id", org_id)
    .eq("stripe_subscription_status", "active")
    .single()

  if (contractError || !contract) {
    throw new Error("NO_ACTIVE_CONTRACT")
  }

  /* ---------------------------------------------
     2. Resolve entitlement allocation (NOT usage)
  --------------------------------------------- */
  const { data: entitlement, error: entitlementError } = await supabase
    .from("contract_entitlements")
    .select("id, quantity")
    .eq("contract_id", contract.id)
    .eq("entitlement_type", entitlement_type)
    .single()

  if (entitlementError || !entitlement) {
    throw new Error("ENTITLEMENT_NOT_FOUND")
  }

  /* ---------------------------------------------
     3. Acquire advisory transaction lock
  --------------------------------------------- */
  const lockKey = hashLockKey(contract.id, entitlement_type)

  const { error: lockError } = await supabase.rpc(
    "pg_advisory_xact_lock",
    { key: lockKey }
  )

  if (lockError) {
    throw new Error("LOCK_ACQUISITION_FAILED")
  }

  /* ---------------------------------------------
     4. Calculate remaining (AUTHORITATIVE)
  --------------------------------------------- */
  const { data: usageRows, error: usageError } = await supabase
    .from("entitlement_usage")
    .select("quantity_used")
    .eq("contract_id", contract.id)
    .eq("entitlement_id", entitlement.id)

  if (usageError) {
    throw new Error("USAGE_LOAD_FAILED")
  }

  const used = usageRows?.reduce(
    (sum, row) => sum + Number(row.quantity_used),
    0
  ) ?? 0

  const allocated = Number(entitlement.quantity)
  const remaining = allocated - used

  /* ---------------------------------------------
     5. Enforce policy
  --------------------------------------------- */
  let enforcement: "normal" | "grace" | "overage" = "normal"

  if (remaining < quantity) {
    const policy = ENTITLEMENT_POLICY[entitlement_type]

    if (!policy || policy.mode === "hard") {
      throw new Error("ENTITLEMENT_EXCEEDED")
    }

    if (
      policy.mode === "grace" &&
      Math.abs(remaining - quantity) <= (policy.grace_limit ?? 0)
    ) {
      enforcement = "grace"
    } else if (policy.mode === "overage") {
      enforcement = "overage"
    } else {
      throw new Error("ENTITLEMENT_EXCEEDED")
    }
  }

  /* ---------------------------------------------
     6. Record usage (AUTHORITATIVE)
  --------------------------------------------- */
  const { error: usageInsertError } = await supabase
    .from("entitlement_usage")
    .insert({
      contract_id: contract.id,
      entitlement_id: entitlement.id,
      work_item_id,
      usage_type,
      quantity_used: quantity,
      occurred_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

  if (usageInsertError) {
    throw new Error("USAGE_RECORD_FAILED")
  }

  return {
    allowed: true,
    enforcement,
    remaining_after: remaining - quantity,
  }
}