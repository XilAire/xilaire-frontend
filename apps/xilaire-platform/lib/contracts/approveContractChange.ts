import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { applyProration } from "@/lib/billing/applyProration"

export async function approveContractChange({
  requestId,
}: {
  requestId: string
}) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  /* ---------------------------------------------
     Load request
  --------------------------------------------- */
  const { data: request, error } = await supabase
    .from("contract_change_requests")
    .select(`
      id,
      contract_id,
      old_monthly_amount,
      new_monthly_amount,
      reason,
      status
    `)
    .eq("id", requestId)
    .single()

  if (error) throw error
  if (request.status !== "pending") return

  /* ---------------------------------------------
     Apply proration
  --------------------------------------------- */
  await applyProration({
    contractId: request.contract_id,
    newMonthlyAmount: request.new_monthly_amount,
    reason: request.reason,
  })

  /* ---------------------------------------------
     Mark approved
  --------------------------------------------- */
  await supabase
    .from("contract_change_requests")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", request.id)
}
