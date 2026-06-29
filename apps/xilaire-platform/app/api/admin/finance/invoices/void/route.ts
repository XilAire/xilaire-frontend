import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripePlatform"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getProfile } from "@/lib/getProfile"

export const runtime = "nodejs"

export async function POST(req: Request) {
  /* ---------------------------------------------
     1. Role gate
  --------------------------------------------- */
  const profile = await getProfile()

  if (!profile || !["finance", "master_admin"].includes(profile.role)) {
    return NextResponse.json(
      { error: "FORBIDDEN" },
      { status: 403 }
    )
  }

  /* ---------------------------------------------
     2. Input validation
  --------------------------------------------- */
  const { invoice_id } = await req.json()

  if (!invoice_id) {
    return NextResponse.json(
      { error: "MISSING_INVOICE_ID" },
      { status: 400 }
    )
  }

  /* ---------------------------------------------
     3. Retrieve invoice (Stripe authoritative)
  --------------------------------------------- */
  const invoice = await stripe.invoices.retrieve(invoice_id)

  if (invoice.status !== "open") {
    return NextResponse.json(
      {
        error: "INVOICE_NOT_VOIDABLE",
        status: invoice.status,
      },
      { status: 409 }
    )
  }

  /* ---------------------------------------------
     4. Void invoice
  --------------------------------------------- */
  const voided = await stripe.invoices.voidInvoice(invoice_id)

  /* ---------------------------------------------
     5. Audit log (Supabase)
  --------------------------------------------- */
  await supabaseAdmin
    .from("platform_audit_logs")
    .insert({
      actor_id: profile.id,
      actor_role: profile.role,
      action: "INVOICE_VOIDED",
      target_type: "stripe_invoice",
      target_id: invoice_id,
      metadata: {
        previous_status: invoice.status,
        final_status: voided.status,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
      },
      created_at: new Date().toISOString(),
    })

  /* ---------------------------------------------
     6. Response
  --------------------------------------------- */
  return NextResponse.json({
    success: true,
    invoice_id,
    status: voided.status,
  })
}