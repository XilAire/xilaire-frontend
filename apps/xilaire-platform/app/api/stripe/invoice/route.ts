import Stripe from "stripe"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

/* -------------------------------------------------
   STRIPE CLIENT (NO apiVersion — PER YOUR RULE)
------------------------------------------------- */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/* -------------------------------------------------
   SUPABASE — SERVICE ROLE
------------------------------------------------- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

/* -------------------------------------------------
   POST — GENERATE STRIPE INVOICE
------------------------------------------------- */
export async function POST(req: Request) {
  console.log("[STRIPE-INVOICE] Route hit")

  try {
    const { invoiceId } = await req.json()

    if (!invoiceId) {
      return new NextResponse("Missing invoiceId", { status: 400 })
    }

    /* ---------------------------------------------
       LOAD INTERNAL INVOICE
    --------------------------------------------- */
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single()

    if (error || !invoice) {
      return new NextResponse("Invoice not found", { status: 404 })
    }

    const amountCents = Math.round(Number(invoice.total_amount) * 100)

    if (amountCents < 100) {
      return new NextResponse("Invoice total must be >= $1.00", { status: 400 })
    }

    /* ---------------------------------------------
       STRIPE CUSTOMER — ALWAYS CREATE FRESH (TEST MODE)
    --------------------------------------------- */
    const customer = await stripe.customers.create({
      name: "XilAire Technologies",
      email: "receivable@xilairetechnologies.com",
      metadata: {
        internal_invoice_id: invoice.id,
        org_id: invoice.org_id,
      },
    })

    const stripeCustomerId = customer.id

    await supabase
      .from("invoices")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", invoice.id)

    /* ---------------------------------------------
       CREATE STRIPE INVOICE (DRAFT)
    --------------------------------------------- */
    const stripeInvoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: "charge_automatically",
      auto_advance: false,
      payment_settings: {
        payment_method_types: ["card"],
      },
    })

    /* ---------------------------------------------
       ATTACH LINE ITEM (REQUIRES customer + invoice)
    --------------------------------------------- */
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      invoice: stripeInvoice.id,
      amount: amountCents,
      currency: "usd",
      description: `Invoice ${invoice.id}`,
    })

    /* ---------------------------------------------
       FINALIZE (THIS MAKES IT APPEAR IN STRIPE)
    --------------------------------------------- */
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(
      stripeInvoice.id
    )

    if (!finalizedInvoice.hosted_invoice_url) {
      throw new Error("Stripe did not return hosted_invoice_url")
    }

    /* ---------------------------------------------
       PERSIST STRIPE DATA
    --------------------------------------------- */
    await supabase
      .from("invoices")
      .update({
        stripe_invoice_id: finalizedInvoice.id,
        stripe_invoice_status: finalizedInvoice.status,
        hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
        issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id)

    return NextResponse.json({
      stripeInvoiceId: finalizedInvoice.id,
      hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
    })
  } catch (err) {
    console.error("[STRIPE-INVOICE] FATAL ERROR", err)
    return new NextResponse("Stripe invoice failed", { status: 500 })
  }
}
