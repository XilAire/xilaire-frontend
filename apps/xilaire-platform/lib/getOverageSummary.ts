import { supabaseAdmin } from "@/lib/supabaseAdmin"

export type OverageSummaryRow = {
  contract_id: string
  entitlement_type: string
  overage_quantity: number
  overage_events: number
  first_overage_at: string
  last_overage_at: string
}

export async function getOverageSummaryForContract(
  contractId: string
): Promise<OverageSummaryRow[]> {
  const { data, error } = await supabaseAdmin
    .from("entitlement_overage_summary")
    .select("*")
    .eq("contract_id", contractId)

  if (error) {
    throw new Error("OVERAGE_SUMMARY_LOAD_FAILED")
  }

  return (data ?? []) as OverageSummaryRow[]
}