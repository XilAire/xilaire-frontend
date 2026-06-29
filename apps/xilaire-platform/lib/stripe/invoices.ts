import { stripe } from "./server"
import { getOrCreateStripeCustomer } from "./customers"
import { getAdhocInvoiceProductId } from "./products"
import { createServerSupabaseClient } from "@/lib/supabaseServer"

export async function createStripeInvoice(invoiceId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      id,
      org_id,
      invoice_line_items (
        description,
        quantity,
        unit_price
      )
    `)
    .eq("id", invoiceId)
    .single()

  if (error || !invoice) {
    throw error ?? new Error("Invoice not found")
  }

  const customerId = await getOrCreateStripeCustomer(invoice.org_id)
  const productId = await getAdhocInvoiceProductId()

  for (const item of invoice.invoice_line_items) {
    await stripe.invoiceItems.create({
      customer: customerId,
      description: item.description, // visible on invoice
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(Number(item.unit_price) * 100),
        product: productId,
      },
    })
  }

  const stripeInvoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: 15,
    payment_settings: {
      payment_method_types: ["card", "us_bank_account"],
    },
    metadata: {
      internal_invoice_id: invoice.id,
    },
  })

  await stripe.invoices.finalizeInvoice(stripeInvoice.id)

  await supabase
    .from("invoices")
    .update({ stripe_invoice_id: stripeInvoice.id })
    .eq("id", invoice.id)

  return stripeInvoice
}
