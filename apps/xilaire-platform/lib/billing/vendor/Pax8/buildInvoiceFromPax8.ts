import { createServerSupabaseClient } from "@/lib/supabaseServer"

interface BuildInvoiceParams {
  orgId: string
  billingPeriodStart: string
  billingPeriodEnd: string
  markupPercent: number
}

export async function buildInvoiceFromPax8({
  orgId,
  billingPeriodStart,
  billingPeriodEnd,
  markupPercent,
}: BuildInvoiceParams) {
  const supabase = await createServerSupabaseClient()

  /* -------------------------------------------
     Fetch Pax8 Subscriptions
  -------------------------------------------- */
  const { data: subscriptions, error } = await supabase
    .from("vendor_subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .eq("vendor", "pax8")
    .eq("status", "active")

  if (error) throw error
  if (!subscriptions?.length) return null

  /* -------------------------------------------
     Create Invoice Header
  -------------------------------------------- */
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      org_id: orgId,
      vendor: "pax8",
      period_start: billingPeriodStart,
      period_end: billingPeriodEnd,
      status: "draft",
    })
    .select()
    .single()

  if (invoiceError) throw invoiceError

  /* -------------------------------------------
     Build Line Items
  -------------------------------------------- */
  const lineItems = subscriptions.map((sub) => {
    const unitPrice = sub.unit_cost * (1 + markupPercent / 100)

    return {
      invoice_id: invoice.id,
      description: sub.product_name,
      quantity: sub.quantity,
      unit_cost: sub.unit_cost,
      unit_price: unitPrice,
      total: unitPrice * sub.quantity,
      vendor_subscription_id: sub.vendor_subscription_id,
    }
  })

  const { error: lineError } = await supabase
    .from("invoice_line_items")
    .insert(lineItems)

  if (lineError) throw lineError

  /* -------------------------------------------
     Finalize Invoice Total
  -------------------------------------------- */
  const total = lineItems.reduce((sum, i) => sum + i.total, 0)

  await supabase
    .from("invoices")
    .update({ total })
    .eq("id", invoice.id)

  return invoice
}
