import { supabaseAdmin } from "@/lib/supabaseAdmin"

type AssertEntitlementInput = {
  contractId: string
  entitlementType: string
  quantityRequested: number
  workItemId: string
  usageType: string
}

export async function assertEntitlement({
  contractId,
  entitlementType,
  quantityRequested,
  workItemId,
  usageType,
}: AssertEntitlementInput) {
  // 1️⃣ Load entitlement
  const { data: entitlement, error: entitlementError } =
    await supabaseAdmin
      .from("contract_entitlements")
      .select("id, quantity")
      .eq("contract_id", contractId)
      .eq("entitlement_type", entitlementType)
      .single()

  if (entitlementError || !entitlement) {
    throw new Error(
      `Entitlement '${entitlementType}' not found for contract`
    )
  }

  // 2️⃣ Sum usage
  const { data: usageRows, error: usageError } =
    await supabaseAdmin
      .from("entitlement_usage")
      .select("quantity_used")
      .eq("contract_id", contractId)
      .eq("entitlement_id", entitlement.id)

  if (usageError) {
    throw new Error("Failed to load entitlement usage")
  }

  const used = usageRows?.reduce(
    (sum, row) => sum + Number(row.quantity_used),
    0
  ) ?? 0

  const remaining = entitlement.quantity - used

  // 3️⃣ HARD ENFORCEMENT
  if (remaining < quantityRequested) {
    throw new Error(
      `Entitlement exceeded: ${entitlementType} (remaining ${remaining})`
    )
  }

  // 4️⃣ RECORD USAGE (AUTHORITATIVE)
  const { error: insertError } = await supabaseAdmin
    .from("entitlement_usage")
    .insert({
      contract_id: contractId,
      entitlement_id: entitlement.id,
      work_item_id: workItemId,
      usage_type: usageType,
      quantity_used: quantityRequested,
      occurred_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

  if (insertError) {
    throw new Error("Failed to record entitlement usage")
  }

  return {
    entitlementId: entitlement.id,
    used,
    remaining: remaining - quantityRequested,
  }
}