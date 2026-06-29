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

  if (invoice.status !== "paid") {
    return NextResponse.json(
      {
        error: "INVOICE_NOT_CREDITABLE",
        status: invoice.status,
      },
      { status: 409 }
    )
  }

  /* ---------------------------------------------
     4. Create FULL credit note (Stripe)
     Stripe resolves underlying charge automatically
  --------------------------------------------- */
  const creditNote = await stripe.creditNotes.create({
    invoice: invoice_id,
    amount: invoice.amount_paid,
    reason: "order_change",
  })

  /* ---------------------------------------------
     5. Audit log (Supabase)
  --------------------------------------------- */
  await supabaseAdmin
    .from("platform_audit_logs")
    .insert({
      actor_id: profile.id,
      actor_role: profile.role,
      action: "CREDIT_NOTE_CREATED",
      target_type: "stripe_invoice",
      target_id: invoice_id,
      metadata: {
        credit_note_id: creditNote.id,
        amount: creditNote.amount,
        currency: creditNote.currency,
      },
      created_at: new Date().toISOString(),
    })

  /* ---------------------------------------------
     6. Response
  --------------------------------------------- */
  return NextResponse.json({
    success: true,
    invoice_id,
    credit_note_id: creditNote.id,
  })
}