import { createServerSupabaseClient } from "@/lib/supabaseServer"
import { resolveInvoiceLinesForOrg } from "@/lib/billing/resolveInvoiceLines"

interface CreateDraftInvoiceParams {
  orgId: string
  vendor: string
  periodStart: string // ISO date
  periodEnd: string   // ISO date
}

/* -------------------------------------------------
   CREATE DRAFT INVOICE — IDEMPOTENT
------------------------------------------------- */
export async function createDraftInvoiceForOrg({
  orgId,
  vendor,
  periodStart,
  periodEnd,
}: CreateDraftInvoiceParams) {
  const supabase = await createServerSupabaseClient()

  /* -------------------------------------------
     Guard: existing draft for same period
  -------------------------------------------- */
  const { data: existing, error: existingErr } = await supabase
    .from("invoices")
    .select("id")
    .eq("org_id", orgId)
    .eq("vendor", vendor)
    .eq("status", "draft")
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle()

  if (existingErr) throw existingErr
  if (existing?.id) {
    return { invoice_id: existing.id, status: "exists" }
  }

  /* -------------------------------------------
     Resolve invoice lines (STEP 3)
  -------------------------------------------- */
  const lines = await resolveInvoiceLinesForOrg(orgId)
  const vendorLines = lines.filter(l => l.vendor === vendor)

  if (!vendorLines.length) {
    return { invoice_id: null, status: "no_lines" }
  }

  const subtotal = Number(
    vendorLines.reduce((sum, l) => sum + l.line_total, 0).toFixed(2)
  )

  /* -------------------------------------------
     Create invoice header
  -------------------------------------------- */
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      org_id: orgId,
      vendor,
      status: "draft",
      period_start: periodStart,
      period_end: periodEnd,
      subtotal,
      total: subtotal,
    })
    .select()
    .single()

  if (invErr) throw invErr

  /* -------------------------------------------
     Persist line items
  -------------------------------------------- */
  const items = vendorLines.map((l) => ({
    invoice_id: invoice.id,
    vendor_subscription_id: l.vendor_subscription_id,
    sku: l.sku,
    product_name: l.product_name,
    quantity: l.quantity,
    unit_cost: l.unit_cost,
    unit_price: l.unit_price,
    line_total: l.line_total,
    billing_cycle: l.billing_cycle,
  }))

  const { error: lineErr } = await supabase
    .from("invoice_line_items")
    .insert(items)

  if (lineErr) throw lineErr

  return {
    invoice_id: invoice.id,
    status: "created",
    subtotal,
    line_count: items.length,
  }
}
