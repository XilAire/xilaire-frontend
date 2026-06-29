import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_PLATFORM!
)

export async function POST(req: Request) {
  const { invoice_id } = await req.json()

  if (!invoice_id) {
    return new Response("Missing invoice_id", { status: 400 })
  }

  /* -------------------------------------------------
     LOAD INVOICE (AUTHORITATIVE)
  ------------------------------------------------- */
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoice_id)
    .single()

  if (invoiceError || !invoice) {
    return new Response("Invoice not found", { status: 404 })
  }

  if (invoice.status !== "paid") {
    return new Response("Invoice not paid", { status: 409 })
  }

  if (invoice.entitlements_activated) {
    return new Response("Already activated", { status: 200 })
  }

  /* -------------------------------------------------
     RESOLVE SERVICE TIER
  ------------------------------------------------- */
  const { data: tier, error: tierError } = await supabase
    .from("service_tiers")
    .select("*")
    .eq("stripe_payment_link_id", invoice.stripe_payment_link_id)
    .single()

  if (tierError || !tier) {
    return new Response("Service tier not found", { status: 500 })
  }

  /* -------------------------------------------------
     FETCH TIER ENTITLEMENTS
  ------------------------------------------------- */
  const { data: entitlements, error: entError } = await supabase
    .from("service_entitlements")
    .select("*")
    .eq("service_tier_id", tier.id)

  if (entError) {
    return new Response("Failed to load entitlements", { status: 500 })
  }

  /* -------------------------------------------------
     ACTIVATE ORG ENTITLEMENTS (IDEMPOTENT)
  ------------------------------------------------- */
  for (const ent of entitlements ?? []) {
    await supabase
      .from("org_entitlements")
      .upsert(
        {
          org_id: invoice.org_id,
          entitlement_key: ent.entitlement_key,
          source_invoice_id: invoice.id,
          active: true,
          granted_at: new Date().toISOString(),
        },
        {
          onConflict: "org_id,entitlement_key",
        }
      )
  }

  /* -------------------------------------------------
     MARK INVOICE COMPLETE
  ------------------------------------------------- */
  await supabase
    .from("invoices")
    .update({
      entitlements_activated: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id)

  return new Response("Entitlements activated", { status: 200 })
}
