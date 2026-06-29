import Stripe from "stripe"
import { createServerSupabaseClient } from "@/lib/supabaseServer"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/* -------------------------------------------------
   🔐 Stripe type patch (SDK missing field)
------------------------------------------------- */
type StripeInvoiceWithPI = Stripe.Invoice & {
  payment_intent?: string | Stripe.PaymentIntent | null
}

export async function syncInvoicesToStripe() {
  const supabase = await createServerSupabaseClient()

  /* ---------------------------------------------
     1️⃣ Fetch draft invoices not yet synced
  --------------------------------------------- */
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      id,
      status,
      stripe_invoice_id,
      billing_accounts (
        stripe_customer_id
      ),
      invoice_line_items (
        description,
        quantity,
        unit_price
      )
    `)
    .eq("status", "draft")
    .is("stripe_invoice_id", null)

  if (error) throw error
  if (!invoices?.length) return

  /* ---------------------------------------------
     2️⃣ Sync each invoice (idempotent)
  --------------------------------------------- */
  for (const invoice of invoices) {
    const stripeCustomerId =
      invoice.billing_accounts?.[0]?.stripe_customer_id

    if (!stripeCustomerId) {
      throw new Error(
        `Missing Stripe customer for invoice ${invoice.id}`
      )
    }

    if (!invoice.invoice_line_items?.length) {
      throw new Error(
        `Invoice ${invoice.id} has no line items`
      )
    }

    /* -----------------------------------------
       Create Stripe invoice (IDEMPOTENT)
    ----------------------------------------- */
    const stripeInvoice = await stripe.invoices.create(
      {
        customer: stripeCustomerId,
        auto_advance: false,
        collection_method: "charge_automatically",
        metadata: {
          internal_invoice_id: invoice.id,
        },
      },
      {
        idempotencyKey: `invoice_create_${invoice.id}`,
      }
    )

    /* -----------------------------------------
       Attach line items (IDEMPOTENT)
    ----------------------------------------- */
    for (const [index, item] of invoice.invoice_line_items.entries()) {
      await stripe.invoiceItems.create(
        {
          customer: stripeCustomerId,
          invoice: stripeInvoice.id,
          amount: Math.round(item.unit_price * 100),
          currency: "usd",
          quantity: item.quantity,
          description: item.description,
        },
        {
          idempotencyKey: `invoice_item_${invoice.id}_${index}`,
        }
      )
    }

    /* -----------------------------------------
       Finalize Stripe invoice (IDEMPOTENT)
    ----------------------------------------- */
    const finalized =
      await stripe.invoices.finalizeInvoice(
        stripeInvoice.id,
        {},
        {
          idempotencyKey: `invoice_finalize_${invoice.id}`,
        }
      )

    const finalizedInvoice =
      finalized as unknown as StripeInvoiceWithPI

    const paymentIntentId =
      typeof finalizedInvoice.payment_intent === "string"
        ? finalizedInvoice.payment_intent
        : finalizedInvoice.payment_intent?.id ?? null

    /* -----------------------------------------
       Persist Stripe IDs (single write)
    ----------------------------------------- */
    await supabase
      .from("invoices")
      .update({
        stripe_invoice_id: finalizedInvoice.id,
        stripe_payment_intent_id: paymentIntentId,
        issued_at: new Date().toISOString(),
        status: "open",
      })
      .eq("id", invoice.id)
  }
}
