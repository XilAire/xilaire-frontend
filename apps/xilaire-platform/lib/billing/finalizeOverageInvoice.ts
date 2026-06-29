import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { stripe } from "@/lib/stripePlatform"
import { writePlatformAuditLog } from "@/lib/writePlatformAuditLog"

/* -------------------------------------------------
   FINALIZE OVERAGE INVOICE (ADMIN ONLY)
------------------------------------------------- */
export async function finalizeOverageInvoice({
  invoice_id,
  approved_by,
}: {
  invoice_id: string
  approved_by: string
}) {
  /* ---------------------------------------------
     1. Retrieve invoice (AUTHORITATIVE)
  --------------------------------------------- */
  const invoice = await stripe.invoices.retrieve(invoice_id)

  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND")
  }

  if (invoice.status !== "draft") {
    throw new Error("INVOICE_NOT_DRAFT")
  }

  /* ---------------------------------------------
     2. Finalize invoice (NO AUTO-PAY)
  --------------------------------------------- */
  const finalized = await stripe.invoices.finalizeInvoice(invoice_id, {
    auto_advance: false,
  })

  /* ---------------------------------------------
     3. Write platform audit log
  --------------------------------------------- */
  await writePlatformAuditLog({
    action: "OVERAGE_INVOICE_FINALIZED",
    actor: approved_by,
    target_id: invoice_id,
    metadata: {
      customer_id: finalized.customer,
      amount_due: finalized.amount_due,
      currency: finalized.currency,
    },
  })

  /* ---------------------------------------------
     4. Return authoritative result
  --------------------------------------------- */
  return {
    finalized: true,
    invoice_id: finalized.id,
    amount_due: finalized.amount_due,
    hosted_invoice_url: finalized.hosted_invoice_url,
  }
}