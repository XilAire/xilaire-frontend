import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { syncInvoicesToStripe } from "./syncInvoicesToStripe"

/* -------------------------------------------------
   📅 Monthly Billing Engine
------------------------------------------------- */
export async function runMonthlyBilling() {
  const supabase = await createServerSupabaseClient()
  const now = new Date()

  /* ---------------------------------------------
     1️⃣ Find contracts ready to bill
  --------------------------------------------- */
  const { data: contracts, error } = await supabase
    .from("contracts")
    .select(`
      id,
      org_id,
      current_period_start,
      current_period_end,
      monthly_amount
    `)
    .eq("status", "active")
    .lt("current_period_end", now.toISOString())

  if (error) throw error
  if (!contracts?.length) return

  /* ---------------------------------------------
     2️⃣ Process each contract
  --------------------------------------------- */
  for (const contract of contracts) {
    const periodStart = new Date(contract.current_period_start)
    const periodEnd = new Date(contract.current_period_end)

    /* -----------------------------------------
       2a️⃣ Guard: prevent duplicate invoices
    ----------------------------------------- */
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("contract_id", contract.id)
      .eq("period_start", periodStart.toISOString())
      .eq("period_end", periodEnd.toISOString())
      .limit(1)

    if (existing?.length) continue

    /* -----------------------------------------
       2b️⃣ Create draft invoice
    ----------------------------------------- */
    const { data: invoice, error: invoiceError } =
      await supabase
        .from("invoices")
        .insert({
          org_id: contract.org_id,
          contract_id: contract.id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          status: "draft",
          total_amount: contract.monthly_amount,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (invoiceError) throw invoiceError

    /* -----------------------------------------
       2c️⃣ Add line item
    ----------------------------------------- */
    await supabase
      .from("invoice_line_items")
      .insert({
        invoice_id: invoice.id,
        description: "Monthly service subscription",
        quantity: 1,
        unit_price: contract.monthly_amount,
      })

    /* -----------------------------------------
       2d️⃣ Roll billing window forward
    ----------------------------------------- */
    const nextStart = new Date(periodEnd)
    const nextEnd = new Date(periodEnd)
    nextEnd.setMonth(nextEnd.getMonth() + 1)

    await supabase
      .from("contracts")
      .update({
        current_period_start: nextStart.toISOString(),
        current_period_end: nextEnd.toISOString(),
      })
      .eq("id", contract.id)
  }

  /* ---------------------------------------------
     3️⃣ Hand off to Stripe sync
  --------------------------------------------- */
  await syncInvoicesToStripe()
}
