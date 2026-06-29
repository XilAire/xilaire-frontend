import { createServerSupabaseClient } from "@/lib/supabaseServer"

export async function requestContractChange({
  contractId,
  newMonthlyAmount,
  reason,
}: {
  contractId: string
  newMonthlyAmount: number
  reason: string
}) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data: contract, error } = await supabase
    .from("contracts")
    .select("id, monthly_amount")
    .eq("id", contractId)
    .single()

  if (error) throw error

  await supabase
    .from("contract_change_requests")
    .insert({
      contract_id: contract.id,
      requested_by: user.id,
      old_monthly_amount: contract.monthly_amount,
      new_monthly_amount: newMonthlyAmount,
      reason,
      status: "pending",
    })
}
