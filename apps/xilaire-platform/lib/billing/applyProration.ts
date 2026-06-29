import { createServerSupabaseClient } from "@/lib/supabaseServer"

/* -------------------------------------------------
   🔁 Apply Proration for Mid-Cycle Change
------------------------------------------------- */
export async function applyProration({
  contractId,
  newMonthlyAmount,
  reason,
}: {
  contractId: string
  newMonthlyAmount: number
  reason: string
}) {
  const supabase = await createServerSupabaseClient()
  const now = new Date()

  /* ---------------------------------------------
     1️⃣ Load contract
  --------------------------------------------- */
  const { data: contract, error } = await supabase
    .from("contracts")
    .select(`
      id,
      org_id,
      monthly_amount,
      current_period_start,
      current_period_end
    `)
    .eq("id", contractId)
    .single()

  if (error) throw error

  const periodStart = new Date(contract.current_period_start)
  const periodEnd = new Date(contract.current_period_end)

  /* ---------------------------------------------
     2️⃣ Calculate proration window
  --------------------------------------------- */
  const totalDays =
    (periodEnd.getTime() - periodStart.getTime()) /
    (1000 * 60 * 60 * 24)

  const remainingDays =
    (periodEnd.getTime() - now.getTime()) /
    (1000 * 60 * 60 * 24)

  if (remainingDays <= 0) return

  const oldDaily =
    contract.monthly_amount / totalDays

  const newDaily =
    newMonthlyAmount / totalDays

  const credit =
    oldDaily * remainingDays

  const charge =
    newDaily * remainingDays

  const prorationAmount =
    Math.round((charge - credit) * 100) / 100

  if (prorationAmount === 0) return

  /* ---------------------------------------------
     3️⃣ Find or create draft invoice
  --------------------------------------------- */
  let invoiceId: string

  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("contract_id", contract.id)
    .eq("status", "draft")
    .limit(1)
    .single()

  if (existingInvoice) {
    invoiceId = existingInvoice.id
  } else {
    const { data: newInvoice, error: invError } =
      await supabase
        .from("invoices")
        .insert({
          org_id: contract.org_id,
          contract_id: contract.id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          status: "draft",
          total_amount: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (invError) throw invError
    invoiceId = newInvoice.id
  }

  /* ---------------------------------------------
     4️⃣ Insert proration line item
  --------------------------------------------- */
  await supabase
    .from("invoice_line_items")
    .insert({
      invoice_id: invoiceId,
      description: `Proration adjustment — ${reason}`,
      quantity: 1,
      unit_price: prorationAmount,
    })

  /* ---------------------------------------------
     5️⃣ Update contract amount going forward
  --------------------------------------------- */
  await supabase
    .from("contracts")
    .update({
      monthly_amount: newMonthlyAmount,
    })
    .eq("id", contract.id)
}
