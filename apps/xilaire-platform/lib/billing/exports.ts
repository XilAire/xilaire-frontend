import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { toCSV } from "@/lib/utils/csv"

export async function exportInvoicesCSV() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("v_invoice_net")
    .select("*")

  if (error) throw error
  return toCSV(data ?? [])
}
