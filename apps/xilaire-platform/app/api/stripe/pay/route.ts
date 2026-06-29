import Stripe from "stripe"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

/* -------------------------------------------------
   STRIPE CLIENT
------------------------------------------------- */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/* -------------------------------------------------
   SUPABASE — PLATFORM SERVICE ROLE
------------------------------------------------- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

/* -------------------------------------------------
   POST — PAY INVOICE
------------------------------------------------- */
export async function POST(req: Request) {
  const { invoiceId } = await req.json()

  if (!invoiceId) {
    return new NextResponse("Missing invoiceId", { status: 400 })
  }

  /* -------------------------------------------------
     LOAD INTERNAL INVOICE
  ------------------------------------------------- */
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single()

  if (error || !invoice) {
    console.error("❌ Invoice not found", error)
    return new NextResponse("Invoice not found", { status: 404 })
  }

  if (!invoice.stripe_invoice_id || !invoice.hosted_invoice_url) {
    return new NextResponse("Stripe invoice not ready", { status: 400 })
  }

  /* -------------------------------------------------
     REDIRECT USER TO STRIPE HOSTED INVOICE
     (Stripe controls payment + return UX)
  ------------------------------------------------- */
  return NextResponse.redirect(invoice.hosted_invoice_url)
}
