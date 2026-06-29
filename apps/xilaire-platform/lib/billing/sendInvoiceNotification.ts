import { stripe } from "@/lib/stripePlatform"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog"

/* -------------------------------------------------
   SEND CUSTOMER INVOICE NOTIFICATION
------------------------------------------------- */
export async function sendInvoiceNotification(invoiceId: string) {
  /* ---------------------------------------------
     1. Retrieve invoice from Stripe (AUTHORITATIVE)
  --------------------------------------------- */
  const invoice = await stripe.invoices.retrieve(invoiceId)

  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND")
  }

  if (invoice.status !== "open") {
    throw new Error("INVOICE_NOT_OPEN")
  }

  /* ---------------------------------------------
     2. Resolve customer + contract metadata
  --------------------------------------------- */
  const contractId = invoice.metadata?.contract_id

  if (!contractId) {
    throw new Error("MISSING_CONTRACT_METADATA")
  }

  const { data: contract, error } = await supabaseAdmin
    .from("contracts")
    .select("org_id, stripe_customer_id")
    .eq("id", contractId)
    .single()

  if (error || !contract) {
    throw new Error("CONTRACT_LOOKUP_FAILED")
  }

  /* ---------------------------------------------
     3. Send invoice via Stripe (EMAIL)
     Stripe handles delivery + retries
  --------------------------------------------- */
  await stripe.invoices.sendInvoice(invoiceId)

  /* ---------------------------------------------
     4. Audit log
  --------------------------------------------- */
  await writePlatformAuditLog({
    action: "OVERAGE_INVOICE_SENT",
    actor: "system",
    target_id: invoiceId,
    metadata: {
      contract_id: contractId,
      org_id: contract.org_id,
      amount_due: invoice.amount_due,
      hosted_invoice_url: invoice.hosted_invoice_url,
    },
  })

  return {
    sent: true,
    invoice_id: invoice.id,
    hosted_invoice_url: invoice.hosted_invoice_url,
  }
}