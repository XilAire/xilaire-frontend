import { stripe } from "@/lib/stripePlatform"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getProfile } from "@/lib/getProfile"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const profile = await getProfile()

  if (!profile || !["finance", "master_admin"].includes(profile.role)) {
    return NextResponse.json(
      { error: "FORBIDDEN" },
      { status: 403 }
    )
  }

  const { invoice_id } = await req.json()

  if (!invoice_id) {
    return NextResponse.json(
      { error: "MISSING_INVOICE_ID" },
      { status: 400 }
    )
  }

  /* ---------------------------------------------
     1. Retrieve invoice (Stripe authoritative)
  --------------------------------------------- */
  const invoice = await stripe.invoices.retrieve(invoice_id)

  if (invoice.status !== "draft") {
    return NextResponse.json(
      { error: "INVOICE_NOT_DRAFT" },
      { status: 409 }
    )
  }

  /* ---------------------------------------------
     2. Finalize invoice
  --------------------------------------------- */
  const finalized = await stripe.invoices.finalizeInvoice(invoice_id)

  /* ---------------------------------------------
     3. Audit log (Supabase)
  --------------------------------------------- */
  await supabaseAdmin
    .from("platform_audit_logs")
    .insert({
      actor_id: profile.id,
      actor_role: profile.role,
      action: "INVOICE_FINALIZED",
      target_type: "stripe_invoice",
      target_id: invoice_id,
      metadata: {
        amount_due: finalized.amount_due,
        currency: finalized.currency,
      },
      created_at: new Date().toISOString(),
    })

  return NextResponse.json({
    success: true,
    invoice_id,
    status: finalized.status,
  })
}