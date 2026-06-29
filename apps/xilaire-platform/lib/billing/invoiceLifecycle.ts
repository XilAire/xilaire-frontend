import { createServerSupabaseClient } from "@/lib/supabaseServer"

async function getInvoice(supabase: any, invoiceId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, org_id, status, total_amount")
    .eq("id", invoiceId)
    .single()

  if (error) throw error
  return data
}

/* -------------------------------------------------
   APPROVE INVOICE (DRAFT → APPROVED)
------------------------------------------------- */
export async function approveInvoice(invoiceId: string) {
  const supabase = await createServerSupabaseClient()
  const invoice = await getInvoice(supabase, invoiceId)

  if (invoice.status !== "draft") {
    throw new Error("Invoice is not in draft status")
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)

  if (error) throw error

  return { invoice_id: invoiceId, status: "approved" }
}

/* -------------------------------------------------
   ISSUE INVOICE (APPROVED → ISSUED)
------------------------------------------------- */
export async function issueInvoice(invoiceId: string) {
  const supabase = await createServerSupabaseClient()
  const invoice = await getInvoice(supabase, invoiceId)

  if (invoice.status !== "approved") {
    throw new Error("Invoice is not approved")
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "issued",
      issued_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)

  if (error) throw error

  return { invoice_id: invoiceId, status: "issued" }
}

/* -------------------------------------------------
   MARK INVOICE PAID (ISSUED → PAID)
------------------------------------------------- */
export async function markInvoicePaid(invoiceId: string) {
  const supabase = await createServerSupabaseClient()
  const invoice = await getInvoice(supabase, invoiceId)

  if (invoice.status !== "issued") {
    throw new Error("Invoice is not issued")
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)

  if (error) throw error

  return { invoice_id: invoiceId, status: "paid" }
}
