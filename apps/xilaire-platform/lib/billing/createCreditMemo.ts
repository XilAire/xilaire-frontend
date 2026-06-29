import { createServerSupabaseClient } from "@/lib/supabaseServer"

export async function createCreditMemo(params: {
  invoiceId: string
  amount: number // MUST be negative
  reason: string
}) {
  if (params.amount >= 0) {
    throw new Error("Credit memo amount must be negative")
  }

  const supabase = await createServerSupabaseClient()

  // Ensure invoice is issued or paid
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", params.invoiceId)
    .single()

  if (error) throw error
  if (!["issued", "paid"].includes(invoice.status)) {
    throw new Error("Credit memos can only be issued after invoice is issued")
  }

  const { error: insertErr } = await supabase
    .from("credit_memos")
    .insert({
      invoice_id: params.invoiceId,
      amount: params.amount,
      reason: params.reason,
    })

  if (insertErr) throw insertErr

  return { invoice_id: params.invoiceId, status: "credit_created" }
}
